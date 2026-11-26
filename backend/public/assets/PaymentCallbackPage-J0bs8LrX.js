import{j as n,S as R,h as P,c as C,a as j,g as N}from"./index-BnsgzZ-h.js";import{a as d}from"./vendor-state-CrcowmQX.js";import{a as k,u as I}from"./vendor-react-Cm4kSo1c.js";function _(){const x=k(),b=I(),p=new URLSearchParams(x.search),o=p.get("payment_ref")||p.get("reference")||p.get("trxref")||"",[g,l]=d.useState("VERIFYING"),[a,h]=d.useState(null),[s,y]=d.useState(null),[v,f]=d.useState("Confirming payment directly with the payment provider..."),S=()=>{try{if(localStorage.getItem("gbs_dev_token"))return"/developer-control-center/dashboard";const t=R(),r=String(t?.role||localStorage.getItem("gbs_auth_role")||"").toUpperCase();return r?r==="DEVELOPER"?"/developer-control-center/dashboard":r==="ADMIN"||r==="SUPER_ADMIN"?"/portal/admin/dashboard":`/portal/${r.toLowerCase()}/dashboard`:"/onboarding"}catch{return"/login"}},m=async()=>{if(!o){l("MISSING"),f("No payment reference was provided in the return link.");return}l("VERIFYING");try{const t=!!(P()||localStorage.getItem("gbs_access_token")||localStorage.getItem("gbs_dev_token"))?`/payments/${encodeURIComponent(o)}/verify`:`/payments/onboarding/verify/${encodeURIComponent(o)}`,i=(await C.get(t)).data?.data;h(i?.transaction||null),y(i?.receipt||null),l(i?.transaction?.gatewayStatus||"PROCESSING"),f(i?.customerMessage||"Payment verification completed.")}catch(e){l("ERROR"),f(e.response?.data?.message||"Could not verify payment status with provider yet.")}};d.useEffect(()=>{m()},[o]);const w=()=>{if(!s&&!a)return;const e=s||{},t=a||{},r=j()||"/assets/gbs_crest_badge.jpg",i=e.institutionName||N()||"GBS Institution",u=window.open("","_blank","width=760,height=860");u&&(u.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Official Fee Receipt - ${e.receiptNumber||t.receiptNumber||t.reference}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
  .box { border: 2px solid #0f172a; padding: 24px; max-width: 640px; margin: 0 auto; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; gap: 12px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
  .paid { font-size: 22px; font-weight: 800; color: #047857; margin-top: 12px; }
</style>
</head>
<body>
  <div class="box">
    <div class="hdr">
      <div class="brand">
        <img src="${r}" alt="Logo" />
        <div><h2 style="margin:0;">${i}</h2><div>Official Verified Payment Receipt</div></div>
      </div>
      <div style="text-align:right;"><strong>${e.receiptNumber||t.receiptNumber||"—"}</strong><br/>${new Date(e.issuedAt||Date.now()).toLocaleString()}</div>
    </div>
    <div class="row"><span>Student / Account</span><strong>${e.studentName||t.studentCode||"—"}</strong></div>
    <div class="row"><span>Payer Contact</span><strong>${t.payerEmail||t.payerPhone||"Verified Payer"}</strong></div>
    <div class="row"><span>Description</span><strong>${e.feeDescription||t.feeAccount||"Institutional Payment"}</strong></div>
    <div class="row"><span>Gateway &amp; Channel</span><strong>${e.gateway||t.gateway} • ${e.channel||t.channel}</strong></div>
    <div class="row"><span>GBS Reference</span><strong>${e.transactionRef||t.reference}</strong></div>
    <div class="row"><span>Provider Reference</span><strong>${e.providerReference||t.providerReference||"—"}</strong></div>
    <div class="row"><span>Status</span><strong>CONFIRMED SUCCESSFUL</strong></div>
    <div class="row"><span>Remaining Balance</span><strong>${e.currency||t.currency||"GHS"} ${Number(e.balanceAfter||0).toFixed(2)}</strong></div>
    <div class="paid">Amount Confirmed: ${e.currency||t.currency||"GHS"} ${Number(e.amountPaid||t.amountPaid||0).toFixed(2)}</div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`),u.document.close())},c=g==="SUCCESSFUL";return n.jsx("div",{style:{minHeight:"100vh",background:"#0f172a",color:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"},children:n.jsxs("div",{style:{maxWidth:"540px",width:"100%",background:"#1e293b",border:`1.5px solid ${c?"#10b981":"#38bdf8"}`,borderRadius:"16px",padding:"28px",boxShadow:"0 20px 50px rgba(0,0,0,0.6)"},children:[n.jsx("div",{style:{fontSize:"0.75rem",fontWeight:700,color:"#38bdf8",textTransform:"uppercase"},children:"GBS Server-to-Server Payment Verification"}),n.jsx("h2",{style:{margin:"6px 0 12px"},children:g==="VERIFYING"?"Confirming Your Payment...":c?"Payment Confirmed":`Status: ${g}`}),n.jsx("p",{style:{fontSize:"0.92rem",color:"#cbd5e1",lineHeight:1.5},children:v}),o&&n.jsxs("div",{style:{background:"rgba(2,6,23,0.6)",padding:"12px",borderRadius:"10px",margin:"16px 0",fontSize:"0.84rem"},children:[n.jsxs("div",{children:["Reference: ",n.jsx("strong",{style:{fontFamily:"monospace",color:"#38bdf8"},children:o})]}),a&&n.jsxs("div",{style:{marginTop:"6px"},children:["Amount: ",n.jsxs("strong",{children:[a.currency," ",Number(a.amountPaid||0).toFixed(2)]})," • Gateway: ",n.jsx("strong",{children:a.gateway})," (",a.channel,")"]}),s&&n.jsxs("div",{style:{marginTop:"6px",color:"#34d399"},children:["Official Receipt: ",n.jsx("strong",{children:s.receiptNumber})," • Remaining Balance: ",n.jsxs("strong",{children:[s.currency," ",Number(s.balanceAfter||0).toFixed(2)]})]})]}),n.jsxs("div",{style:{display:"flex",gap:"10px",marginTop:"18px",flexWrap:"wrap"},children:[c&&n.jsx("button",{type:"button",onClick:w,style:{flex:1,background:"#0284c7",color:"#fff",border:"none",borderRadius:"8px",padding:"10px 14px",fontWeight:700,cursor:"pointer"},children:"Print / Save Official Receipt"}),!c&&o&&n.jsx("button",{type:"button",onClick:m,style:{flex:1,background:"#0284c7",color:"#fff",border:"none",borderRadius:"8px",padding:"10px 14px",fontWeight:700,cursor:"pointer"},children:"Re-Check Provider Status"}),n.jsx("button",{type:"button",onClick:()=>b(S()),style:{flex:1,background:c?"#059669":"#475569",color:"#fff",border:"none",borderRadius:"8px",padding:"10px 14px",fontWeight:700,cursor:"pointer"},children:"Return to Portal"})]})]})})}export{_ as default};
