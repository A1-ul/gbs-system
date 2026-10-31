import React from "react";

import {
    useParams
} from "react-router-dom";

import {
    useQuery
} from "@tanstack/react-query";

import permissionApi from "../../api/permission.api";

import Loader from "../../shared/ui/Loader";
import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";

const PermissionDetails =
    () => {
        const { id } =
            useParams();

        const {
            data,
            isLoading
        } = useQuery({
            queryKey: [
                "permission",
                id
            ],
            queryFn: () =>
                permissionApi.getPermissionById(
                    id
                )
        });

        if (isLoading) {
            return <Loader />;
        }

        const permission =
            data?.data ||
            data ||
            {};

        return (
            <PageContainer>
                <PageHeader
                    title={
                        permission.name ||
                        "Permission Details"
                    }
                />

                <div
                    className="
                    bg-white
                    border
                    rounded-xl
                    p-6
                "
                >
                    <div className="space-y-4">
                        <div>
                            <strong>
                                Name
                            </strong>

                            <p>
                                {
                                    permission.name
                                }
                            </p>
                        </div>

                        <div>
                            <strong>
                                Code
                            </strong>

                            <p>
                                {
                                    permission.code
                                }
                            </p>
                        </div>

                        <div>
                            <strong>
                                Description
                            </strong>

                            <p>
                                {
                                    permission.description
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </PageContainer>
        );
    };

export default PermissionDetails;