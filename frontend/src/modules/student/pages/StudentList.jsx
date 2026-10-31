import { useEffect, useState } from "react";

import studentApi from "../../api/student.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import SearchBar from "../../shared/components/SearchBar";
import ConfirmDialog from "../../shared/components/ConfirmDialog";
import StudentTable from "../components/StudentTable";

export default function StudentList() {
    const [students, setStudents] =
        useState([]);

    const [loading, setLoading] =
        useState(true);

    const [search, setSearch] =
        useState("");

    const [selectedStudent, setSelectedStudent] =
        useState(null);

    useEffect(() => {
        loadStudents();
    }, []);

    async function loadStudents() {
        try {
            setLoading(true);

            const response =
                await studentApi.getStudents();

            setStudents(
                response?.data ||
                []
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!selectedStudent) {
            return;
        }

        try {
            await studentApi.deleteStudent(
                selectedStudent.id
            );

            await loadStudents();

            setSelectedStudent(
                null
            );
        } catch (error) {
            console.error(error);
        }
    }

    const filteredStudents =
        students.filter(
            (student) =>
                `${student.firstName || ""} ${student.lastName || ""}`
                    .toLowerCase()
                    .includes(
                        search.toLowerCase()
                    )
        );

    return (
        <PageContainer>
            <PageHeader
                title="Students"
                subtitle="Manage students"
            />

            <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search Student..."
            />

            <StudentTable
                data={
                    filteredStudents
                }
                loading={loading}
                onDelete={
                    setSelectedStudent
                }
            />

            <ConfirmDialog
                open={
                    !!selectedStudent
                }
                title="Delete Student"
                description="This action cannot be undone."
                onConfirm={
                    handleDelete
                }
                onCancel={() =>
                    setSelectedStudent(
                        null
                    )
                }
            />
        </PageContainer>
    );
}