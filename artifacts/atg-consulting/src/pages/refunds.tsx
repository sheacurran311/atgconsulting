import LegalPage from "@/components/legal/LegalPage";
import md from "@/content/legal/refund-policy.md?raw";

export default function RefundsPage() {
  return <LegalPage title="Refund Policy" markdown={md} />;
}
