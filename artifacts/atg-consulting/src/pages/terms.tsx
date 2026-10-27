import LegalPage from "@/components/legal/LegalPage";
import md from "@/content/legal/terms-of-service.md?raw";

export default function TermsPage() {
  return <LegalPage title="Terms of Service" markdown={md} />;
}
