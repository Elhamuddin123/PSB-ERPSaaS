import { useState } from "react";
import { alertServerError } from "@/lib/i18n-ui";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { isAgencyAdmin } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Plus,
  Trash2,
  ArrowRightLeft,
  Pencil,
} from "lucide-react";

export default function ExchangeRatesPage() {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const canEdit = isAgencyAdmin(user?.role);
  const [createOpen, setCreateOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [editRate, setEditRate] = useState<{ id: number; rate: string; effectiveDate: string } | null>(null);

  const [form, setForm] = useState({
    fromCurrency: "USD",
    toCurrency: "EUR",
    rate: "",
    effectiveDate: new Date().toISOString().split("T")[0],
  });

  const [convertForm, setConvertForm] = useState({
    amount: "",
    from: "USD",
    to: "EUR",
  });

  const utils = trpc.useUtils();

  const { data: ratesData, isLoading } =
    trpc.exchangeRate.list.useQuery({
      limit: 100,
    });

  const { data: currencies } =
    trpc.exchangeRate.currencies.useQuery();

  // NEW
  const { data: liveRates } =
    trpc.exchangeRate.liveRates.useQuery();

  // NEW
  const syncRates =
    trpc.exchangeRate.syncRates.useMutation({
      onSuccess: async () => {
        await utils.exchangeRate.list.invalidate();
      },
      onError: (err) => alertServerError(t, err),
    });

  const createRate =
    trpc.exchangeRate.create.useMutation({
      onSuccess: async () => {
        await utils.exchangeRate.list.invalidate();
        await utils.exchangeRate.currencies.invalidate();

        setCreateOpen(false);

        resetForm();
      },

      onError: (err) => alertServerError(t, err),
    });

  const deleteRate =
    trpc.exchangeRate.delete.useMutation({
      onSuccess: async () => {
        await utils.exchangeRate.list.invalidate();
        await utils.exchangeRate.currencies.invalidate();
      },
      onError: (err) => alertServerError(t, err),
    });

  const updateRate = trpc.exchangeRate.update.useMutation({
    onSuccess: async () => {
      await utils.exchangeRate.list.invalidate();
      setEditRate(null);
      alert(t("alerts.exchangeRateUpdated"));
    },
    onError: (err) => alertServerError(t, err),
  });

  const handleDeleteRate = async (id: number) => {
    try {
      await deleteRate.mutateAsync({ id });
    } catch {
      // error handled in onError above
    }
  };

  const convert =
    trpc.exchangeRate.convert.useQuery(
      {
        amount:
          Number(convertForm.amount) || 0,

        from: convertForm.from,

        to: convertForm.to,
      },
      {
        enabled:
          convertOpen &&
          !!convertForm.amount &&
          !!convertForm.from &&
          !!convertForm.to,
      }
    );

  const resetForm = () =>
    setForm({
      fromCurrency: "USD",
      toCurrency: "EUR",
      rate: "",
      effectiveDate:
        new Date()
          .toISOString()
          .split("T")[0],
    });

  const handleCreate = () => {
    if (
      !form.rate ||
      !form.fromCurrency ||
      !form.toCurrency
    )
      return;

    createRate.mutate({
      fromCurrency:
        form.fromCurrency,

      toCurrency:
        form.toCurrency,

      rate: Number(form.rate),

      effectiveDate:
        form.effectiveDate,
    });
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

        <div>

          <h1 className="text-xl sm:text-2xl font-bold">{t("exchange_rates")}</h1>

          <p className="text-slate-500 text-sm mt-1">{t("manage_multi_currency_exchange_rates")}</p>

        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              syncRates.mutate()
            }
            disabled={
              syncRates.isPending
            }
          >
            {syncRates.isPending
              ? "Refreshing..."
              : "Refresh Live Rates"}
          </Button>

          <Dialog
            open={convertOpen}
            onOpenChange={
              setConvertOpen
            }
          >
            <DialogTrigger asChild>

              <Button
                variant="outline"
                size="sm"
              >
                <ArrowRightLeft className="h-4 w-4 mr-1" />{t("convert")}</Button>

            </DialogTrigger>

            <DialogContent>

              <DialogHeader>
                <DialogTitle>{t("currency_converter")}</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">

                <div>
                  <Label>{t("amount_1_1_1_1")}</Label>

                  <Input
                    type="number"
                    value={
                      convertForm.amount
                    }
                    onChange={(e)=>
                      setConvertForm({
                        ...convertForm,
                        amount:e.target.value
                      })
                    }
                  />
                </div>

                {convert.data && (

                  <div className="rounded-lg p-3 bg-slate-50">

                    <p className="font-bold text-xl">

                      {convert.data.amount.toLocaleString()}

                    </p>

                    <p className="text-xs">

                      Rate:
                      {" "}
                      {convert.data.rate}

                    </p>

                  </div>

                )}

              </div>

            </DialogContent>

          </Dialog>

          <Dialog
            open={createOpen}
            onOpenChange={
              setCreateOpen
            }
          >
            <DialogTrigger asChild>

              <Button size="sm">
                <Plus className="h-4 w-4 mr-1"/>{t("add_rate")}</Button>

            </DialogTrigger>

            <DialogContent>

              <DialogHeader>

                <DialogTitle>{t("add_exchange_rate")}</DialogTitle>

              </DialogHeader>

              <div className="space-y-3">

                <Input
                  placeholder={t("from")}
                  value={
                    form.fromCurrency
                  }
                  onChange={(e)=>
                    setForm({
                      ...form,
                      fromCurrency:
                      e.target.value.toUpperCase()
                    })
                  }
                />

                <Input
                  placeholder={t("to")}
                  value={
                    form.toCurrency
                  }
                  onChange={(e)=>
                    setForm({
                      ...form,
                      toCurrency:
                      e.target.value.toUpperCase()
                    })
                  }
                />

                <Input
                  type="number"
                  value={form.rate}
                  onChange={(e)=>
                    setForm({
                      ...form,
                      rate:e.target.value
                    })
                  }
                />

                <Button
                  onClick={
                    handleCreate
                  }
                >{t("save_rate")}</Button>

              </div>

            </DialogContent>

          </Dialog>

        </div>

      </div>

      {currencies && (
        <div className="flex flex-wrap gap-2">

          {currencies.map(c=>(

            <span
              key={c}
              className="px-2 py-1 rounded-full bg-slate-100 text-xs"
            >
              {c}
            </span>

          ))}

        </div>
      )}

      {liveRates && (

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

          {liveRates.map(rate=>(

            <div
              key={rate.code}
              className="border rounded-xl p-4"
            >

              <p className="text-xs text-slate-500">

                USD → {rate.code}

              </p>

              <p className="font-bold text-lg">

                {Number(rate.rate).toFixed(2)}

              </p>

              <p className="text-green-600 text-xs">{t("live_market")}</p>

            </div>

          ))}

        </div>

      )}

      {isLoading ? (

        <div className="space-y-2">

          <Skeleton className="h-12"/>

          <Skeleton className="h-12"/>

          <Skeleton className="h-12"/>

        </div>

      ) : (

        <div className="overflow-x-auto">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>{t("from_1")}</TableHead>

                <TableHead>{t("to_1")}</TableHead>

                <TableHead>{t("rate")}</TableHead>

                <TableHead>{t("date_1_1_1_1_1")}</TableHead>

                <TableHead>{t("source_1_1")}</TableHead>

                <TableHead>{t("action_1")}</TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {(ratesData?.items||[]).map(rate=>(

                <TableRow
                  key={rate.id}
                >

                  <TableCell>
                    {rate.fromCurrency}
                  </TableCell>

                  <TableCell>
                    {rate.toCurrency}
                  </TableCell>

                  <TableCell>
                    {Number(rate.rate).toFixed(6)}
                  </TableCell>

                  <TableCell>
                    {String(rate.effectiveDate)}
                  </TableCell>

                  <TableCell>
                    {rate.source}
                  </TableCell>

                  <TableCell>

                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 mr-1"
                        title={t("edit_exchange_rate")}
                        onClick={() => setEditRate({
                          id: rate.id,
                          rate: String(rate.rate),
                          effectiveDate: String(rate.effectiveDate).slice(0, 10),
                        })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRate(rate.id)}
                      disabled={deleteRate.isPending}
                    >
                      {deleteRate.isPending ? (
                        "Deleting..."
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>

                  </TableCell>

                </TableRow>

              ))}

            </TableBody>

          </Table>

        </div>

      )}

      <Dialog open={!!editRate} onOpenChange={() => setEditRate(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("edit_exchange_rate")}</DialogTitle></DialogHeader>
          {editRate && (
            <div className="space-y-3">
              <div>
                <Label>{t("rate")}</Label>
                <Input type="number" step="0.000001" value={editRate.rate} onChange={(e) => setEditRate({ ...editRate, rate: e.target.value })} />
              </div>
              <div>
                <Label>{t("date_1_1_1_1_1")}</Label>
                <Input type="date" value={editRate.effectiveDate} onChange={(e) => setEditRate({ ...editRate, effectiveDate: e.target.value })} />
              </div>
              <Button
                className="w-full"
                disabled={!editRate.rate || updateRate.isPending}
                onClick={() => updateRate.mutate({
                  id: editRate.id,
                  rate: Number(editRate.rate),
                  effectiveDate: editRate.effectiveDate,
                })}
              >
                {updateRate.isPending ? t("actions.saving") : t("save_changes")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}