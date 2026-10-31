import PropTypes from "prop-types";

function Table({
    columns = [],
    data = []
}) {

    return (
        <table className="gbs-table">

            <thead>
                <tr>
                    {
                        columns.map(
                            (column) => (
                                <th key={column.key}>
                                    {column.title}
                                </th>
                            )
                        )
                    }
                </tr>
            </thead>

            <tbody>

                {
                    data.map(
                        (row, index) => (
                            <tr key={index}>

                                {
                                    columns.map(
                                        (column) => (
                                            <td key={column.key}>
                                                {
                                                    row[
                                                        column.key
                                                    ]
                                                }
                                            </td>
                                        )
                                    )
                                }

                            </tr>
                        )
                    )
                }

            </tbody>

        </table>
    );
}

Table.propTypes = {
    columns: PropTypes.array,
    data: PropTypes.array
};

export default Table;