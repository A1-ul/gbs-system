import {
    useEffect,
    useState
} from "react";

import parentApi
    from "../../api/parent.api";

import ParentTable
    from "../components/ParentTable";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

import SearchBar
    from "../../shared/components/SearchBar";

import ConfirmDialog
    from "../../shared/components/ConfirmDialog";

export default function ParentList() {

    const [
        parents,
        setParents
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    const [
        search,
        setSearch
    ] = useState("");

    const [
        selectedParent,
        setSelectedParent
    ] = useState(null);

    useEffect(() => {
        loadParents();
    }, []);

    async function loadParents() {

        try {

            setLoading(true);

            const response =
                await parentApi.getParents();

            setParents(
                response?.data || []
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);
        }
    }

    async function handleDelete() {

        if (!selectedParent) {
            return;
        }

        try {

            await parentApi.deleteParent(
                selectedParent.id
            );

            await loadParents();

            setSelectedParent(
                null
            );

        } catch (error) {

            console.error(error);
        }
    }

    const filteredParents =
        parents.filter(
            (parent) =>
                `${parent.firstName || ""} ${parent.lastName || ""}`
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    )
        );

    return (
        <PageContainer>

            <PageHeader
                title="Parents"
                subtitle="Manage Parents"
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search Parent"
            />

            <ParentTable
                data={filteredParents}
                loading={loading}
                onDelete={
                    setSelectedParent
                }
            />

            <ConfirmDialog
                open={!!selectedParent}
                title="Delete Parent"
                description="This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() =>
                    setSelectedParent(
                        null
                    )
                }
            />

        </PageContainer>
    );
}