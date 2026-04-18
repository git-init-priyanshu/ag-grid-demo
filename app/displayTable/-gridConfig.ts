import { type ColDef } from "ag-grid-community";
import type { Data } from "../../api/types";
// import {
//   DateRenderer,
//   QuetionsRenderer,
//   LinkRenderer,
//   SourceRenderer,
// } from "./-cellRenderer";
// import CustomRichSelectEditor from "./-customCellEditor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const columns: ColDef<Data, any>[] = [
  {
    headerName: "Title",
    field: "title",
    filter: "agTextColumnFilter",
    editable: true,
    sortable: true,
    minWidth: 220,
  },
  {
    headerName: "Author",
    field: "author",
    filter: "agTextColumnFilter",
    editable: true,
    sortable: true,
    minWidth: 180,
  },
  {
    headerName: "Genre",
    field: "genre",
    filter: "agSetColumnFilter",
    sortable: true,
    minWidth: 140,
    editable: true,
  },
  {
    headerName: "Published Year",
    field: "publishedYear",
    filter: "agNumberColumnFilter",
    sortable: true,
    width: 140,
    editable: true,
  },
  {
    headerName: "Pages",
    field: "pages",
    filter: "agNumberColumnFilter",
    sortable: true,
    width: 110,
    editable: true,
  },
  {
    headerName: "Rating",
    field: "rating",
    filter: "agNumberColumnFilter",
    sortable: true,
    width: 120,
    editable: true,
    valueFormatter: (params) => (params.value ? `${params.value} ⭐` : ""),
  },
  {
    headerName: "Price ($)",
    field: "price",
    filter: "agNumberColumnFilter",
    sortable: true,
    editable: true,
    width: 130,
    valueFormatter: (params) =>
      params.value ? `$${params.value.toFixed(2)}` : "",
  },
  {
    headerName: "Stock",
    field: "stock",
    filter: "agNumberColumnFilter",
    sortable: true,
    width: 110,
    editable: true,
    cellClassRules: {
      "low-stock": (params) => params.value < 15,
    },
  },
  {
    headerName: "Language",
    field: "language",
    filter: "agSetColumnFilter",
    width: 130,
    editable: true,
  },
  {
    headerName: "Publisher",
    field: "publisher",
    filter: "agTextColumnFilter",
    minWidth: 180,
    editable: true,
  },
  {
    headerName: "Created At",
    field: "createdAt",
    filter: "agDateColumnFilter",
    sortable: true,
    width: 180,
    editable: true,
    valueFormatter: (params) =>
      params.value ? new Date(params.value).toLocaleDateString() : "",
  },
];
