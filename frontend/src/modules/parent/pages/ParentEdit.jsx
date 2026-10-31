import {
    useEffect,
    useState
} from "react";

import {
    useNavigate,
    useParams
} from "react-router-dom";

import parentApi
    from "../../api/parent.api";

import ParentForm
    from "../components/ParentForm";

import Loader
    from "../../shared/ui/Loader";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

export default function ParentEdit() {

    const { id } =
        useParams();

    const navigate =
        useNavigate();

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

    async function handleSubmit(
        values
    ) {

        try {

            await parentApi.updateParent(
                id,
                values
            );

            navigate(
                "/parents"
            );

        } catch (error) {

            console.error(error);
        }
    }

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>

            <PageHeader
                title="Edit Parent"
            />

            <ParentForm
                initialValues={
                    parent
                }
                onSubmit={
                    handleSubmit
                }
            />

        </PageContainer>
    );
}