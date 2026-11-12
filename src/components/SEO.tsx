import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSiteConfig } from "@/contexts/SiteConfigContext";
import { loadRouteSeoCatalog } from "@/lib/cms/repository";
import type { RouteSeoMetadata } from "@/lib/cms/types";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
}

export default function SEO({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
}: SEOProps) {
  const { config } = useSiteConfig();
  const [override, setOverride] = useState<RouteSeoMetadata | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    void loadRouteSeoCatalog().then(({ routes }) => {
      if (!active) return;
      const found = routes.find((r) => r.routePath === url) ?? null;
      setOverride(found);
    });
    return () => {
      active = false;
    };
  }, [url]);

  const siteTitle = `${config.doctorName} - ${config.clinicName}`;
  const defaultDescription = `${config.doctorName}, ${config.title}. ${config.specialization}. Book your appointment today at ${config.clinicName}.`;
  const defaultKeywords = `orthopedic doctor near me, best knee replacement surgeon near me, best fracture care near me, best hip replacement surgeon near me, best orthopedic doctor in Hyderabad, ${config.doctorName}, ${config.clinicName}, joint replacement, sports medicine, orthopedic surgeon Hyderabad, bone specialist, trauma care`;
  const siteUrl = "https://orthocarehub.in";
  const defaultImage = `${siteUrl}/og-image.svg`;

  const resolvedTitle = override?.seoTitle || title;
  const pageTitle = resolvedTitle ? `${resolvedTitle} | ${siteTitle}` : siteTitle;
  const pageDescription = override?.seoDescription || description || defaultDescription;
  const pageKeywords = override?.seoKeywords || keywords || defaultKeywords;
  const pageImage = override?.ogImageUrl || image || defaultImage;
  const pageUrl = override?.canonicalUrl || (url ? `${siteUrl}${url}` : siteUrl);
  const robotsContent = override?.noindex ? "noindex, nofollow" : "index, follow";

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:site_name" content={siteTitle} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={pageUrl} />
      <meta property="twitter:title" content={pageTitle} />
      <meta property="twitter:description" content={pageDescription} />
      <meta property="twitter:image" content={pageImage} />

      {/* Additional Meta Tags */}
      <meta name="author" content={config.doctorName} />
      <meta name="robots" content={robotsContent} />
      <meta name="language" content="English" />
      <link rel="canonical" href={pageUrl} />
    </Helmet>
  );
}
