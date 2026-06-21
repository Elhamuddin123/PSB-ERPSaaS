import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { alertServerError } from "@/lib/i18n-ui";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { isAgencyAdmin } from "@/lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { FileText, Trash2, FileCheck, Pencil, Search } from "lucide-react";
import { useClientTable } from "@/lib/client-table";

const statusColors: Record<string, string> = {
  draft: "bg-slate-100 text-slate-800",
  generated: "bg-blue-100 text-blue-800",
  sent: "bg-emerald-100 text-emerald-800",
  archived: "bg-gray-100 text-gray-800",
};

const typeLabels: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  voucher: "Voucher",
  statement: "Statement",
  report: "Report",
  attachment: "Attachment",
};

const entityLabels: Record<string, string> = {
  invoice: "Invoice",
  ticket: "Ticket",
  deposit: "Deposit",
  supplier_payment: "Payment",
  expense: "Expense",
  report: "Report",
  other: "Other",
};

export default function DocumentsPage() {
  const [entityType, setEntityType] = useState("__all__");
  const [documentType, setDocumentType] = useState("__all__");
  const [search, setSearch] = useState("");
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const canEdit = isAgencyAdmin(user?.role);
  const [editDoc, setEditDoc] = useState<{
    id: number;
    documentNumber: string;
    fileName: string;
    status: "draft" | "generated" | "sent" | "archived";
    sentTo: string;
  } | null>(null);

  const utils = trpc.useUtils();
  const { data: stats } = trpc.document.stats.useQuery();
  const { data: docsData, isLoading, error } = trpc.document.list.useQuery({
    entityType: entityType !== "__all__" ? entityType : undefined,
    documentType: documentType !== "__all__" ? documentType : undefined,
    search: search || undefined,
    limit: 100,
  });

  const deleteDoc = trpc.document.delete.useMutation({
    onSuccess: async () => {
      await utils.document.list.invalidate();
      await utils.document.stats.invalidate();
    },
  });
  const updateDoc = trpc.document.update.useMutation({
    onSuccess: async () => {
      await utils.document.list.invalidate();
      await utils.document.stats.invalidate();
      setEditDoc(null);
      alert(t("alerts.documentUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });

  const getSortValue = useCallback((doc: NonNullable<typeof docsData>["items"][number], key: string) => {
    switch (key) {
      case "document": return doc.fileName || doc.documentNumber || "";
      case "type": return doc.documentType;
      case "entity": return `${doc.entityType}-${doc.entityId}`;
      case "generated": return doc.generatedAt ? new Date(doc.generatedAt).getTime() : 0;
      case "status": return doc.status;
      default: return "";
    }
  }, []);

  const { rows: docRows, sortKey, sortDir, toggleSort } = useClientTable({
    items: docsData?.items ?? [],
    search: "",
    getSearchText: () => "",
    defaultSortKey: "generated",
    getSortValue,
  });

  if (isLoading) return <div className="py-8 text-center text-slate-500">{t("loading")}</div>;
  if (error) return <div className="py-8 text-center text-red-600">Error loading documents: {error.message}</div>;
  if (!docsData) return <div className="py-8 text-center text-slate-500">{t("noData")}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t("documents")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("manageDocuments")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /></div>
              <span className="text-xs text-slate-500">{t("total_documents")}</span>
            </div>
            <p className="text-xl font-bold mt-1">{stats?.totalDocuments ?? 0}</p>
          </CardContent>
        </Card>
        {(stats?.byType || []).map(t => (
          <Card key={t.type} className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-slate-500">{typeLabels[t.type] || t.type}</p>
              <p className="text-xl font-bold mt-1">{t.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={t("searchDocuments")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t("entity_type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("all_entities")}</SelectItem>
            <SelectItem value="invoice">{t("invoice")}</SelectItem>
            <SelectItem value="ticket">{t("ticket")}</SelectItem>
            <SelectItem value="deposit">{t("deposit")}</SelectItem>
            <SelectItem value="supplier_payment">{t("payment")}</SelectItem>
            <SelectItem value="expense">{t("expense")}</SelectItem>
            <SelectItem value="report">{t("report")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder={t("doc_type")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("all_types")}</SelectItem>
            <SelectItem value="invoice">{t("invoice")}</SelectItem>
            <SelectItem value="receipt">{t("receipt")}</SelectItem>
            <SelectItem value="voucher">{t("voucher")}</SelectItem>
            <SelectItem value="statement">{t("statement")}</SelectItem>
            <SelectItem value="report">{t("report")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label={t("document")} sortKey="document" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("type")} sortKey="type" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("entity")} sortKey="entity" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("generated")} sortKey="generated" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortableTableHead label={t("statusColumn")} sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <TableHead className="text-right">{t("action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docRows.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell className="text-xs font-medium">{doc.fileName || doc.documentNumber || "—"}</TableCell>
                  <TableCell className="text-xs">{typeLabels[doc.documentType] || doc.documentType}</TableCell>
                  <TableCell className="text-xs">{entityLabels[doc.entityType] || doc.entityType} #{doc.entityId}</TableCell>
                  <TableCell className="text-xs">{doc.generatedAt ? String(doc.generatedAt) : "—"}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${statusColors[doc.status] || ""}`}>{doc.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t("edit_document")}
                          onClick={() => setEditDoc({
                            id: doc.id,
                            documentNumber: doc.documentNumber || "",
                            fileName: doc.fileName || "",
                            status: doc.status,
                            sentTo: doc.sentTo || "",
                          })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteDoc.mutate({ id: doc.id })}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {docRows.length === 0 && !isLoading && (
        <div className="text-center py-12 text-slate-500">
          <FileCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p className="text-lg font-medium">{t("noDocumentsYet")}</p>
          <p className="text-sm mt-1">{t("generateDocumentsDescription")}</p>
        </div>
      )}
      {!docsData && !isLoading && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-sm">{t("failed_to_load_documents_check_console")}</p>
        </div>
      )}
      <Dialog open={!!editDoc} onOpenChange={() => setEditDoc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("edit_document")}</DialogTitle></DialogHeader>
          {editDoc && (
            <div className="space-y-3 pt-2">
              <div>
                <Label>{t("document_number")}</Label>
                <Input value={editDoc.documentNumber} onChange={(e) => setEditDoc({ ...editDoc, documentNumber: e.target.value })} />
              </div>
              <div>
                <Label>{t("file_name")}</Label>
                <Input value={editDoc.fileName} onChange={(e) => setEditDoc({ ...editDoc, fileName: e.target.value })} />
              </div>
              <div>
                <Label>{t("statusColumn")}</Label>
                <Select value={editDoc.status} onValueChange={(v) => setEditDoc({ ...editDoc, status: v as typeof editDoc.status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">draft</SelectItem>
                    <SelectItem value="generated">generated</SelectItem>
                    <SelectItem value="sent">sent</SelectItem>
                    <SelectItem value="archived">archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("sent_to")}</Label>
                <Input value={editDoc.sentTo} onChange={(e) => setEditDoc({ ...editDoc, sentTo: e.target.value })} placeholder="email@example.com" />
              </div>
              <Button
                className="w-full bg-indigo-600"
                disabled={updateDoc.isPending}
                onClick={() => updateDoc.mutate({
                  id: editDoc.id,
                  documentNumber: editDoc.documentNumber || undefined,
                  fileName: editDoc.fileName || undefined,
                  status: editDoc.status,
                  sentTo: editDoc.sentTo || undefined,
                })}
              >
                {updateDoc.isPending ? t("actions.saving") : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
