import {
    useEffect,
    useState
} from "react";

import admissionApi
    from "../api/admission.api";

import AdmissionTable
    from "../components/AdmissionTable";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

import SearchBar
    from "../../shared/components/SearchBar";

export default function AdmissionList() {

    const [
        admissions,
        setAdmissions
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        search,
        setSearch
    ] = useState("");

    useEffect(() => {
        loadAdmissions();
    }, []);

    async function loadAdmissions() {

        try {

            setLoading(true);

            const response =
                await admissionApi.getAdmissions();

            setAdmissions(
                response?.data || []
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);
        }
    }

    async function handleApprove(
        admission
    ) {

        try {

            await admissionApi.approveAdmission(
                admission.id
            );

            await loadAdmissions();

        } catch (error) {

            console.error(error);
        }
    }

    async function handleReject(
        admission
    ) {

        try {

            await admissionApi.rejectAdmission(
                admission.id,
                "Rejected"
            );

            await loadAdmissions();

        } catch (error) {

            console.error(error);
        }
    }

    const filteredData =
        admissions.filter(
            (item) =>
                `${item.firstName || ""} ${item.lastName || ""}`
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    )
        );

    return (
        <PageContainer>

            <PageHeader
                title="Admissions"
                subtitle="Admission Management"
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search Admission..."
            />

            <AdmissionTable
                data={filteredData}
                loading={loading}
                onApprove={handleApprove}
                onReject={handleReject}
            />

        </PageContainer>
    );
}