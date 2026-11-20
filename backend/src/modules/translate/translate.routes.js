'use strict';

const express = require('express');
const { readPersistentStore, writePersistentStore } = require('../../core/database/persistentStore');
const socketServer = require('../../core/socket/socketServer');

const router = express.Router();
const { translateBatchTexts } = require('./uiBatchTranslator.service');

const TRANSLATION_LANG_MAP = {
  TWI: 'ak',
  TW: 'ak',
  AKAN: 'ak',
  AK: 'ak',
  GA: 'gaa',
  GAA: 'gaa',
  EWE: 'ee',
  EE: 'ee',
  HAUSA: 'ha',
  HA: 'ha',
  FRENCH: 'fr',
  FR: 'fr',
  ENGLISH: 'en',
  EN: 'en',
  SPANISH: 'es',
  ES: 'es',
  ARABIC: 'ar',
  AR: 'ar',
  CHINESE: 'zh-CN',
  'ZH-CN': 'zh-CN',
  ZH: 'zh-CN',
  SWAHILI: 'sw',
  SW: 'sw',
  YORUBA: 'yo',
  YO: 'yo',
  GERMAN: 'de',
  DE: 'de',
  PORTUGUESE: 'pt',
  PT: 'pt',
  HINDI: 'hi',
  HI: 'hi',
  ZULU: 'zu',
  ZU: 'zu',
  JAPANESE: 'ja',
  JA: 'ja'
};

const STOP_WORDS_FOR_BREAKDOWN = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one',
  'our', 'out', 'has', 'his', 'how', 'its', 'may', 'new', 'now', 'see', 'way', 'who',
  'did', 'get', 'had', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'from', 'that',
  'this', 'they', 'have', 'been', 'will', 'your', 'into', 'what', 'when', 'where', 'which',
  'there', 'their', 'about', 'would', 'could', 'should', 'please', 'kindly', 'must', 'then'
]);

const SERVER_TRANSLATION_CACHE = new Map();
const SERVER_DICTIONARY_CACHE = new Map();

function setBoundedCache(cache, key, value, maxSize = 400) {
  if (cache.size >= maxSize) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function translateNeuralText(text, targetIso, sourceIso = 'auto', options = {}) {
  const clean = String(text || '').trim();
  if (!clean) return { translatedText: '', detectedSourceLang: 'en', provider: 'none', dictMeta: null };

  const skipDict = Boolean(options?.skipDictionary);
  const cacheKey = `${sourceIso}|${targetIso}|${clean}`;
  if (SERVER_TRANSLATION_CACHE.has(cacheKey)) {
    const cached = SERVER_TRANSLATION_CACHE.get(cacheKey);
    if (skipDict || cached.dictMeta) return cached;
  }

  let translatedText = '';
  let detectedSourceLang = sourceIso === 'auto' ? 'en' : sourceIso;
  let provider = 'none';
  let dictMeta = null;

  // 1. Google translate_a/single (dict-chrome-ex -> gtx fallback; retrieves translations, source detection & dict definitions)
  for (const clientTag of ['dict-chrome-ex', 'gtx']) {
    if (translatedText && (skipDict || dictMeta)) break;
    try {
      const dtParams = skipDict ? 'dt=t' : 'dt=t&dt=bd&dt=md&dt=ex';
      const singleUrl = `https://translate.googleapis.com/translate_a/single?client=${clientTag}&sl=${encodeURIComponent(sourceIso)}&tl=${encodeURIComponent(targetIso)}&${dtParams}&q=${encodeURIComponent(clean)}`;
      const res = await fetchWithTimeout(singleUrl, {}, 2500);
      if (res.ok) {
        const gtxData = await res.json();
        if (!translatedText && Array.isArray(gtxData?.[0])) {
          translatedText = gtxData[0]
            .map((seg) => (Array.isArray(seg) ? seg[0] : ''))
            .join('')
            .trim();
          if (translatedText) provider = `google_${clientTag}`;
        }
        if (gtxData?.[2]) {
          detectedSourceLang = gtxData[2];
        }
        if (!dictMeta && Array.isArray(gtxData?.[12]) && gtxData[12].length > 0) {
          const firstBlock = gtxData[12][0];
          const defs = firstBlock?.[1] || [];
          dictMeta = {
            partOfSpeech: firstBlock?.[0] || '',
            definition: Array.isArray(defs[0]) ? defs[0][0] || '' : '',
            example: Array.isArray(defs[0]) ? defs[0][2] || '' : '',
            secondaryDefinition: Array.isArray(defs[1]) ? defs[1][0] || '' : ''
          };
        }
      }
    } catch { }
  }

  // 2. Wikimedia MinT NLLB Neural Translator (reliable on cloud datacenter IPs; skip 'gaa' because MinT 'ga' is Irish)
  const mintSrc = sourceIso === 'auto' ? 'en' : (sourceIso === 'zh-CN' ? 'zh' : sourceIso);
  const mintDst = targetIso === 'zh-CN' ? 'zh' : targetIso;
  if (!translatedText && mintDst !== 'gaa' && mintSrc !== 'gaa' && mintSrc !== mintDst) {
    try {
      const mintRes = await fetchWithTimeout(
        'https://translate.wmcloud.org/api/translate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_language: mintSrc,
            target_language: mintDst,
            content: clean,
            format: 'text'
          })
        },
        5000
      );
      if (mintRes.ok) {
        const mintData = await mintRes.json();
        if (mintData?.translation && String(mintData.translation).trim()) {
          translatedText = String(mintData.translation).trim();
          provider = `wikimedia_mint_${mintData.model || 'nllb'}`;
        }
      }
    } catch { }
  }

  // 3. Google clients5 RPC fallback (non-blocked IPs; handles gaa too)
  if (!translatedText) {
    try {
      const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${encodeURIComponent(sourceIso)}&tl=${encodeURIComponent(targetIso)}&q=${encodeURIComponent(clean)}`;
      const res = await fetchWithTimeout(url, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (typeof data[0] === 'string') {
            translatedText = data[0].trim();
          } else if (Array.isArray(data[0])) {
            translatedText = data
              .map((seg) => (Array.isArray(seg) ? String(seg[0] || '') : typeof seg === 'string' ? seg : ''))
              .join(' ')
              .trim();
            if (data[0]?.[1]) detectedSourceLang = String(data[0][1]);
          }
        } else if (typeof data === 'string') {
          translatedText = data.trim();
        }
        if (translatedText) provider = 'google_dict_rpc';
      }
    } catch { }
  }

  // 4. MyMemory fallback with institutional identifier (never use gaa as MyMemory lacks Ga)
  if (!translatedText && targetIso !== 'gaa') {
    try {
      const srcPair = sourceIso === 'auto' ? 'en' : sourceIso;
      const mmDst = targetIso === 'ak' ? 'tw' : targetIso;
      if (srcPair !== mmDst) {
        const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=${encodeURIComponent(`${srcPair}|${mmDst}`)}&de=support@gbssystem.org`;
        const mmRes = await fetchWithTimeout(mmUrl, {}, 3800);
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          const match = mmData?.responseData?.translatedText;
          if (
            match &&
            !String(match).includes('MYMEMORY WARNING') &&
            !String(match).includes('INVALID LANGUAGE')
          ) {
            translatedText = String(match).trim();
            provider = 'mymemory';
          }
        }
      }
    } catch { }
  }

  const result = { translatedText, detectedSourceLang, provider, dictMeta };
  if (translatedText) {
    setBoundedCache(SERVER_TRANSLATION_CACHE, cacheKey, result, 500);
  }
  return result;
}

async function lookupEnglishDictionary(rawWord) {
  const cleanWord = String(rawWord || '').trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9'-]+$/gi, '');
  if (!cleanWord) return null;

  if (SERVER_DICTIONARY_CACHE.has(cleanWord)) {
    return SERVER_DICTIONARY_CACHE.get(cleanWord);
  }

  let found = null;

  // 1. Free Dictionary API
  try {
    const dictRes = await fetchWithTimeout(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {}, 3500);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
      const firstEntry = Array.isArray(dictData) ? dictData[0] : null;
      const firstMeaning = firstEntry?.meanings?.[0];
      const firstDef = firstMeaning?.definitions?.[0];
      if (firstDef?.definition) {
        found = {
          word: firstEntry?.word || cleanWord,
          phonetic: firstEntry?.phonetic || firstEntry?.phonetics?.find((p) => p?.text)?.text || '',
          partOfSpeech: firstMeaning?.partOfSpeech || '',
          definition: firstDef.definition,
          secondaryDefinition:
            firstMeaning?.definitions?.[1]?.definition ||
            firstEntry?.meanings?.[1]?.definitions?.[0]?.definition ||
            '',
          example: firstDef.example || '',
          synonyms: (firstMeaning?.synonyms || firstDef?.synonyms || []).slice(0, 6)
        };
      }
    }
  } catch { }

  // 2. Datamuse WordNet Definitions fallback
  if (!found || !found.definition) {
    try {
      const dmRes = await fetchWithTimeout(`https://api.datamuse.com/words?sp=${encodeURIComponent(cleanWord)}&md=d&max=3`, {}, 3500);
      if (dmRes.ok) {
        const dmData = await dmRes.json();
        const exact = (Array.isArray(dmData) ? dmData : []).find(
          (item) => String(item.word || '').toLowerCase() === cleanWord && Array.isArray(item.defs) && item.defs.length > 0
        ) || (Array.isArray(dmData) ? dmData[0] : null);
        if (exact && Array.isArray(exact.defs) && exact.defs.length > 0) {
          const parseDef = (d) => {
            const parts = String(d).split('\t');
            const posCode = parts[0] === 'n' ? 'noun' : parts[0] === 'v' ? 'verb' : parts[0] === 'adj' ? 'adjective' : parts[0] === 'adv' ? 'adverb' : parts[0] || '';
            return { pos: posCode, text: (parts[1] || parts[0] || '').trim() };
          };
          const primary = parseDef(exact.defs[0]);
          const secondary = exact.defs[1] ? parseDef(exact.defs[1]) : null;
          if (primary.text) {
            found = {
              word: exact.word || cleanWord,
              phonetic: '',
              partOfSpeech: primary.pos,
              definition: primary.text,
              secondaryDefinition: secondary?.text || '',
              example: '',
              synonyms: []
            };
          }
        }
      }
    } catch { }
  }

  // 3. Wiktionary REST definition fallback
  if (!found || !found.definition) {
    try {
      const wkRes = await fetchWithTimeout(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(cleanWord)}`, {}, 3500);
      if (wkRes.ok) {
        const wkData = await wkRes.json();
        const enEntries = Array.isArray(wkData?.en) ? wkData.en : [];
        const firstBlock = enEntries[0];
        const firstDefHtml = firstBlock?.definitions?.[0]?.definition || '';
        const stripHtml = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const defClean = stripHtml(firstDefHtml);
        if (defClean) {
          found = {
            word: cleanWord,
            phonetic: '',
            partOfSpeech: String(firstBlock?.partOfSpeech || '').toLowerCase(),
            definition: defClean,
            secondaryDefinition: stripHtml(firstBlock?.definitions?.[1]?.definition || ''),
            example: stripHtml(firstBlock?.definitions?.[0]?.examples?.[0] || ''),
            synonyms: []
          };
        }
      }
    } catch { }
  }

  if (found) {
    setBoundedCache(SERVER_DICTIONARY_CACHE, cleanWord, found, 400);
  }
  return found;
}

async function handleServerTranslation(req, res) {
  try {
    const rawText = String(req.body?.text || req.body?.q || req.query?.text || req.query?.q || '').trim();
    const rawLang = String(req.body?.targetLang || req.body?.tl || req.query?.targetLang || req.query?.tl || 'TWI').trim();
    if (!rawText) {
      return res.status(400).json({ status: 'error', message: 'Please provide text or a word to translate.' });
    }

    const upperLang = rawLang.toUpperCase();
    const tl = TRANSLATION_LANG_MAP[upperLang] || rawLang.toLowerCase() || 'ak';

    const translationRes = await translateNeuralText(rawText, tl, 'auto');
    const translatedText = translationRes.translatedText;
    const detectedSourceLang = translationRes.detectedSourceLang || 'en';
    const provider = translationRes.provider || 'none';
    const dictMeta = translationRes.dictMeta;

    const wordTokens = rawText.replace(/[^\w\s'-]/g, ' ').split(/\s+/).filter(Boolean);
    let phonetic = '';
    let partOfSpeech = dictMeta?.partOfSpeech || '';
    let definition = dictMeta?.definition || '';
    let secondaryDefinition = dictMeta?.secondaryDefinition || '';
    let example = dictMeta?.example || '';
    let synonyms = [];
    let backTranslation = '';
    const keyTermsBreakdown = [];

    if (wordTokens.length === 1) {
      const wordToDefine = tl === 'en' && translatedText && !translatedText.includes(' ')
        ? translatedText
        : wordTokens[0];
      const dictEntry = await lookupEnglishDictionary(wordToDefine);
      if (dictEntry) {
        phonetic = dictEntry.phonetic || '';
        partOfSpeech = dictEntry.partOfSpeech || partOfSpeech;
        definition = dictEntry.definition || definition;
        secondaryDefinition = dictEntry.secondaryDefinition || secondaryDefinition;
        example = dictEntry.example || example;
        synonyms = dictEntry.synonyms || [];
      }
      if (tl !== 'en' && translatedText && translatedText.toLowerCase() !== rawText.toLowerCase()) {
        const rev = await translateNeuralText(translatedText, 'en', tl);
        if (rev.translatedText) backTranslation = rev.translatedText;
      }
    } else {
      const uniqueContentWords = [];
      const seen = new Set();
      for (const tok of wordTokens) {
        const low = tok.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
        if (low.length >= 3 && !STOP_WORDS_FOR_BREAKDOWN.has(low) && !seen.has(low)) {
          seen.add(low);
          uniqueContentWords.push(low);
          if (uniqueContentWords.length >= 5) break;
        }
      }

      const [revRes, ...termEntries] = await Promise.all([
        tl !== 'en' && translatedText && translatedText.toLowerCase() !== rawText.toLowerCase()
          ? translateNeuralText(translatedText, 'en', tl)
          : Promise.resolve(null),
        ...uniqueContentWords.map((w) => lookupEnglishDictionary(w))
      ]);

      if (revRes?.translatedText) {
        backTranslation = revRes.translatedText;
      }

      termEntries.forEach((entry, idx) => {
        if (entry && entry.definition) {
          keyTermsBreakdown.push({
            term: uniqueContentWords[idx],
            partOfSpeech: entry.partOfSpeech || 'word',
            meaning: entry.definition
          });
        }
      });

      if (!definition) {
        partOfSpeech = `Statement (${wordTokens.length} words)`;
        if (tl === 'en' && translatedText) {
          definition = translatedText;
        } else if (backTranslation) {
          definition = `Literal English meaning of the ${upperLang} translation: "${backTranslation}"`;
        }
      }
    }

    let translatedDefinition = '';
    if (definition && tl !== 'en') {
      const defToTranslate = backTranslation && wordTokens.length > 1
        ? backTranslation
        : definition;
      const defTr = await translateNeuralText(defToTranslate, tl, 'en');
      translatedDefinition = defTr.translatedText || '';
    }

    const verified = Boolean(translatedText && provider !== 'none');

    return res.status(200).json({
      status: verified ? 'success' : 'fallback',
      data: {
        originalText: rawText,
        targetLang: upperLang,
        iso: tl,
        detectedSourceLang,
        provider,
        verified,
        translatedText: translatedText || '',
        backTranslation,
        meaning: {
          word: rawText,
          phonetic,
          partOfSpeech,
          definition,
          secondaryDefinition,
          translatedDefinition,
          example,
          synonyms,
          keyTermsBreakdown
        }
      }
    });
  } catch (err) {
    return res.status(200).json({
      status: 'fallback',
      data: {
        originalText: String(req.body?.text || req.query?.text || ''),
        translatedText: '',
        verified: false,
        provider: 'error',
        meaning: {}
      }
    });
  }
}

router.post('/', handleServerTranslation);
router.get('/', handleServerTranslation);

router.post('/batch', async (req, res) => {
  try {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts : [];
    const rawLang = String(req.body?.targetLang || req.body?.languageCode || req.body?.tl || 'en').trim();
    const upperLang = rawLang.toUpperCase();
    const targetIso = TRANSLATION_LANG_MAP[upperLang] || rawLang.toLowerCase() || 'en';
    const result = await translateBatchTexts(texts, targetIso, translateNeuralText);
    return res.status(200).json({
      status: 'success',
      data: {
        targetLang: rawLang,
        iso: targetIso,
        ...result
      }
    });
  } catch (err) {
    return res.status(200).json({
      status: 'fallback',
      data: { translations: {}, cachedCount: 0, translatedCount: 0 }
    });
  }
});

router.post('/send-message', async (req, res) => {
  try {
    const {
      senderId = null,
      senderName = 'School Portal User',
      senderRole = 'USER',
      senderEmail = '',
      tenantId = 1,
      receiverRole = 'PARENT',
      receiverRoleLabel = '',
      receiverName = 'All Recipients',
      receiverContact = '',
      originalMessage = '',
      translatedMessage = '',
      meaningSummary = '',
      languageCode = 'TWI',
      languageName = 'Twi (Akan - Ghana)',
      languageFlag = '🇬🇭'
    } = req.body || {};

    if (!String(originalMessage || translatedMessage || '').trim()) {
      return res.status(400).json({ status: 'error', message: 'Message text is required.' });
    }

    const record = {
      id: `TR-MSG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: String(tenantId || '1'),
      senderId,
      senderName: String(senderName || 'School Portal User').trim(),
      senderRole: String(senderRole || 'USER').trim().toUpperCase(),
      senderEmail: String(senderEmail || '').trim(),
      receiverRole: String(receiverRole || 'PARENT').trim().toUpperCase(),
      receiverRoleLabel: String(receiverRoleLabel || receiverRole || 'PARENT').trim(),
      receiverName: String(receiverName || 'All Recipients').trim(),
      receiverContact: String(receiverContact || '').trim(),
      originalMessage: String(originalMessage || '').trim(),
      translatedMessage: String(translatedMessage || '').trim(),
      meaningSummary: String(meaningSummary || '').trim(),
      languageCode: String(languageCode || 'TWI').trim().toUpperCase(),
      languageName: String(languageName || 'Twi (Akan - Ghana)').trim(),
      languageFlag,
      status: 'DELIVERED',
      read: false,
      readAt: null,
      readBy: null,
      sentAt: new Date().toISOString()
    };

    try {
      writePersistentStore((curr) => ({
        ...curr,
        translatedMessages: [record, ...(Array.isArray(curr.translatedMessages) ? curr.translatedMessages : [])].slice(0, 300)
      }));
    } catch { }

    try {
      if (typeof socketServer.getIO === 'function') {
        const io = socketServer.getIO();
        if (io) io.emit('gbs_translated_message', record);
      }
    } catch { }

    return res.status(200).json({
      status: 'success',
      message: `Translated message in ${record.languageName} delivered to ${record.receiverName} (${record.receiverRoleLabel}).`,
      data: record
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

router.get('/messages', (req, res) => {
  try {
    const store = readPersistentStore();
    const all = Array.isArray(store.translatedMessages) ? store.translatedMessages : [];
    const roleFilter = String(req.query?.receiverRole || req.query?.role || '').trim().toUpperCase();
    const limit = Math.min(200, Math.max(1, parseInt(req.query?.limit, 10) || 100));

    const filtered = roleFilter && !['ALL', 'DEVELOPER', 'ADMIN', 'SUPER_ADMIN', 'HEADMASTER'].includes(roleFilter)
      ? all.filter((m) => {
        const rRole = String(m.receiverRole || '').toUpperCase();
        const sRole = String(m.senderRole || '').toUpperCase();
        return rRole === roleFilter || rRole === 'ALL' || sRole === roleFilter;
      })
      : all;

    const sliced = filtered.slice(0, limit);
    const unreadCount = sliced.filter((m) => !m.read).length;

    return res.status(200).json({
      status: 'success',
      results: sliced.length,
      unreadCount,
      data: { messages: sliced, unreadCount }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

router.patch('/messages/:id/read', (req, res) => {
  try {
    const msgId = String(req.params.id || '').trim();
    const readerName = String(req.body?.readerName || req.user?.email || 'Recipient').trim();
    let updatedMsg = null;

    writePersistentStore((curr) => {
      const list = Array.isArray(curr.translatedMessages) ? curr.translatedMessages : [];
      const nextList = list.map((m) => {
        if (String(m.id) === msgId) {
          updatedMsg = { ...m, read: true, readAt: new Date().toISOString(), readBy: readerName };
          return updatedMsg;
        }
        return m;
      });
      return { ...curr, translatedMessages: nextList };
    });

    return res.status(200).json({
      status: 'success',
      data: { message: updatedMsg }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
