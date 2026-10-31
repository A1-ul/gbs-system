import {
    useEffect,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import parentApi
    from "../../api/parent.api";

import ParentCard
    from "../components/ParentCard";

import Loader
    from "../../shared/ui/Loader";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function ParentDetails() {

    const { id } =
        useParams();

    const [
        parent,
        setParent
    ] = useState(null);

    const [
        loading,
        setLoading
    ] = useState(true);

    useEffect(() => {
        loadParent();
    }, []);

    async function loadParent() {

        try {

            const response =
                await parentApi.getParentById(
                    id
                );

            setParent(
                response?.data
            );

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);
        }
    }

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>

            <PageHeader
                title="Parent Details"
            />

            <ParentCard
                parent={parent}
            />

        </PageContainer>
    );
}