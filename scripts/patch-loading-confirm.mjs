import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, "..", "src", "pages");

const replacements = [
  ['? "Creating..." : "Create Location"', '? tc("actions.creating") : tc("actions.createLocation")'],
  ['? "Creating..." : "Create Deposit"', '? tc("actions.creating") : tc("actions.createDeposit")'],
  ['? "Creating..." : "Create Supplier"', '? tc("actions.creating") : tc("actions.createSupplier")'],
  ['? "Creating..." : "Create Bill"', '? tc("actions.creating") : tc("actions.createBill")'],
  ['? "Creating..." : "Issue Loan"', '? tc("actions.creating") : tc("actions.issueLoan")'],
  ['? "Creating..." : "Create Statement"', '? tc("actions.creating") : tc("actions.createStatement")'],
  ['? "Creating..." : "Create Wallet"', '? tc("actions.creating") : tc("actions.createWallet")'],
  ['? "Transferring..." : "Transfer Funds"', '? tc("actions.transferring") : tc("actions.transferFunds")'],
  ['? "Starting..." : "Start Conversation"', '? tc("actions.starting") : tc("actions.startConversation")'],
  ['? "Saving..." : "Save Changes"', '? tc("actions.saving") : tc("actions.saveChanges")'],
  ['? "Processing..." : "Record Payment"', '? tc("actions.processing") : tc("actions.recordPayment")'],
  ['? "Processing..." : "Confirm Repayment"', '? tc("actions.processing") : tc("actions.confirmRepayment")'],
  ['updateUser.isPending ? "Saving..." : "Save Changes"', 'updateUser.isPending ? tc("actions.saving") : tc("actions.saveChanges")'],
  ['createUser.isPending ? "Creating..." : "Create User"', 'createUser.isPending ? tc("actions.creating") : tc("actions.createUser")'],
  ['if (confirm(`Delete location "${loc.name}"? Locations with deposits will be deactivated.`))', 'if (confirm(tc("confirm.deleteLocation", { name: loc.name })))'],
  ['if (confirm(`Delete deposit ${d.depositCode}?${d.status === "approved" ? " Accounting will be reversed." : ""}`))', 'if (confirm(tc("confirm.deleteDeposit", { name: d.depositCode, suffix: d.status === "approved" ? tc("confirm.accountingReversal") : "" })))'],
  ['if (confirm(`Delete expense "${expense.title}"?${expense.status === "approved" ? " Accounting will be reversed." : ""}`))', 'if (confirm(tc("confirm.deleteExpense", { name: expense.title, suffix: expense.status === "approved" ? tc("confirm.accountingReversal") : "" })))'],
  ['if (confirm(`Delete bill ${bill.billNumber}? Accounting will be reversed.`))', 'if (confirm(tc("confirm.deleteBill", { name: bill.billNumber })))'],
  ['if (confirm(`Delete loan ${loan.loanNumber}?`))', 'if (confirm(tc("confirm.deleteLoan", { name: loan.loanNumber })))'],
  ['if (confirm(`Delete supplier "${supplier.companyName}"?`))', 'if (confirm(tc("confirm.deleteSupplier", { name: supplier.companyName })))'],
  ['if (confirm(`Close wallet "${wallet.name}"? It must have zero balance.`))', 'if (confirm(tc("confirm.closeWallet", { name: wallet.name })))'],
  ['alert("Profile updated successfully")', 'alert(tc("alerts.profileUpdated"))'],
  ['alert(seatLimitMessage(planUsage))', 'alert(seatLimitMessage(planUsage, tc))'],
  ['alert(seatLimitMessage(planUsage, userForm.role))', 'alert(seatLimitMessage(planUsage, tc, userForm.role))'],
  ['getSubscriptionStatusLabel(status)', 'getSubscriptionStatusLabel(status, tc)'],
  ['getSubscriptionStatusLabel(user?.subscription?.status)', 'getSubscriptionStatusLabel(user?.subscription?.status, t)'],
  ['formatTotalSeatLabel(planUsage)', 'formatTotalSeatLabel(planUsage, t)'],
];

for (const file of fs.readdirSync(pagesDir).filter((f) => f.endsWith(".tsx"))) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  if (content.includes('tc("actions.') && !content.includes('const { t: tc }')) {
    if (content.includes('useTranslation("common")')) {
      content = content.replace(
        /const \{ t \} = useTranslation\("common"\);/,
        'const { t, t: tc } = useTranslation("common");'
      );
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("Updated", file);
  }
}
