import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from "@mui/material";

const TicketsTable = ({ data }) => {
  const groupedData = data.reduce((acc, row) => {
    const key = row.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const zebraColors = ["#E4F8FC", "#D1F2F5"];

  return (
    <TableContainer>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {["Category", "Subcategory", "Tickets Sold", "Total Revenue"].map((header) => (
              <TableCell
                key={header}
                align="center"
                sx={{ fontWeight: "bold", color: "#fff", backgroundColor: "#00AEEF", fontSize: "1.2rem" }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.keys(groupedData).length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                No Data Available
              </TableCell>
            </TableRow>
          ) : (
            Object.entries(groupedData).map(([category, subcategories], categoryIndex) => (
              <React.Fragment key={categoryIndex}>
                {subcategories.map((row, subIndex) => {
                  const bgColor = zebraColors[categoryIndex % 2];
                  return (
                    <TableRow
                      key={`${category}-${subIndex}-${row.subcategory}`}
                      sx={{ backgroundColor: bgColor }}
                    >
                      {subIndex === 0 ? (
                        <TableCell
                          rowSpan={subcategories.length}
                          align="center"
                          sx={{
                            fontWeight: "bold",
                            fontSize: "1.1rem",
                            backgroundColor: "#00C2CB",
                            color: "#fff",
                            borderRight: "1px solid #ccc",
                          }}
                        >
                          {category}
                        </TableCell>
                      ) : null}
                      <TableCell align="center">{row.subcategory}</TableCell>
                      <TableCell align="center">{Number(row.total_tickets || 0)}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold", color: "#00A651" }}>
                        ${Number(row.total_revenue || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TicketsTable;
