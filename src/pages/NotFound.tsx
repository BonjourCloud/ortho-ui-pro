import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";
import { siteLabel } from "@/lib/cms/siteLabels";
import { usePreviewSiteConfig } from "@/hooks/usePageContent";

const NotFound = () => {
  const location = useLocation();
  const { config } = usePreviewSiteConfig("branding");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="Page Not Found"
        description="The page you are looking for does not exist. Return to our homepage to find what you need."
        url={location.pathname}
      />
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">{siteLabel(config, "notFoundHeading")}</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            {siteLabel(config, "notFoundLinkLabel")}
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
