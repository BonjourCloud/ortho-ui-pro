import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function WhatsAppFloat() {
  const { config } = useSiteConfig();
  const number = config.whatsapp?.replace(/\D/g, "") || config.phone.replace(/\D/g, "");
  const phoneNumber = config.phone;

  if (!config.whatsappFloatEnabled) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4">
      {/* Phone Call Button */}
      <a
        href={`tel:${phoneNumber}`}
        aria-label="Call us"
        className="flex items-center justify-center w-16 h-16 rounded-full bg-[#0088cc] text-white shadow-xl hover:scale-110 transition-transform duration-300"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-9 h-9"
          fill="white"
        >
          <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/>
        </svg>
      </a>

      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${number}?text=${encodeURIComponent("Hi Doctor, I'd like to book a consultation.")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex items-center justify-center w-16 h-16 rounded-full bg-[#25D366] text-white shadow-xl hover:scale-110 transition-transform duration-300"
      >
        <svg
          viewBox="0 0 32 32"
          className="w-10 h-10"
          fill="white"
        >
          <path d="M16 0C7.164 0 0 7.164 0 16c0 2.825.738 5.488 2.031 7.794L0 32l8.394-2.031C10.7 31.262 13.363 32 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm0 29.333c-2.544 0-4.944-.706-6.981-1.931l-.5-.3-5.181 1.256 1.256-5.181-.3-.5C2.706 20.944 2 18.544 2 16 2 8.28 8.28 2 16 2s14 6.28 14 14-6.28 13.333-14 13.333z" />
          <path d="M23.738 19.425c-.4-.2-2.363-1.169-2.731-1.3-.369-.131-.637-.2-.906.2-.269.4-1.038 1.3-1.275 1.569-.237.269-.475.3-.875.1-.4-.2-1.688-.625-3.213-1.988-1.188-1.063-1.988-2.375-2.219-2.775-.231-.4-.025-.619.175-.819.181-.181.4-.475.6-.713.2-.237.269-.4.4-.669.131-.269.069-.5-.031-.7-.1-.2-.906-2.188-1.244-2.994-.331-.788-.669-.681-.906-.694-.237-.013-.506-.019-.775-.019s-.713.1-1.081.5c-.369.4-1.406 1.375-1.406 3.356s1.438 3.894 1.638 4.163c.2.269 2.825 4.313 6.844 6.05.956.413 1.7.656 2.281.844.963.306 1.838.263 2.531.163.775-.119 2.363-.969 2.7-1.906.337-.938.337-1.738.237-1.906-.1-.169-.369-.269-.769-.469z" />
        </svg>
      </a>
    </div>
  );
}
