import { MessageCircle } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function WhatsAppFloat() {
  const { config } = useSiteConfig();
  const number = config.whatsapp?.replace(/\D/g, "") || config.phone.replace(/\D/g, "");

  if (!config.whatsappFloatEnabled) return null;
  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent("Hi Doctor, I'd like to book a consultation.")}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:scale-110 transition-transform"
    >
      <MessageCircle size={28} fill="white" strokeWidth={0} />
    </a>
  );
}
