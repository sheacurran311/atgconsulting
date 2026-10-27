import LegalPage from "@/components/legal/LegalPage";
import md from "@/content/legal/privacy-policy.md?raw";

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" markdown={md} />;
}
