import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, Eye, Heart, ArrowRight } from "lucide-react";
import { useBlogPosts } from "@/hooks/useContent";
import { usePreviewSiteConfig, useSitePageContent } from "@/hooks/usePageContent";
import {
  CmsDraftPreviewBanner,
  PageFaqSection,
  PageHighlightsGrid,
  PageRichBodySection,
} from "@/components/PageCmsSupplement";
import SEO from "@/components/SEO";
import { pageLabel } from "@/lib/cms/siteLabels";

export default function Blog() {
  const { config } = usePreviewSiteConfig();
  const { content: page, usingDraft, workflowStatus } = useSitePageContent("blog");
  const { posts, loading } = useBlogPosts();
  const featured = posts.filter((p) => p.is_featured);
  const rest = posts.filter((p) => !p.is_featured);

  return (
    <>
      <SEO
        title={page.heroTitle || "Blog & Health Tips"}
        description={
          page.heroSubtitle ||
          `Expert orthopedic insights, health tips, and medical advice from ${config.doctorName}. Learn about joint health, injury prevention, and treatment options.`
        }
        keywords="orthopedic blog, health tips, joint health, injury prevention, medical advice, bone health, orthopedic news"
        url="/blog"
      />
      <CmsDraftPreviewBanner usingDraft={usingDraft} workflowStatus={workflowStatus} pageLabel="Blog" />

      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">
              {page.heroEyebrow || "Knowledge Hub"}
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-3">
              {page.heroTitle || "Blog & Health Tips"}
            </h1>
            <p className="text-primary-foreground/70 max-w-lg mx-auto">
              {page.heroSubtitle || `Expert orthopedic insights from ${config.doctorName}`}
            </p>
            {page.heroImageUrl && (
              <div className="mt-8 max-w-2xl mx-auto">
                <img
                  src={page.heroImageUrl}
                  alt={page.heroImageAlt || page.heroTitle}
                  className="rounded-2xl shadow-xl w-full max-h-72 object-cover mx-auto"
                />
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <PageRichBodySection bodyHtml={page.bodyHtml} />

      {page.highlights.length > 0 && (
        <div className="container pt-8">
          <PageHighlightsGrid highlights={page.highlights} />
        </div>
      )}

      <section className="py-12 md:py-20">
        <div className="container">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{pageLabel(page, "loadingText", "Loading posts...")}</div>
          ) : (
            <>
              {featured.length > 0 && (
                <div className="mb-12">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-6">{pageLabel(page, "featuredHeading", "Featured Articles")}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featured.map((post, i) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link
                          to={`/blog/${post.slug}`}
                          className="block bg-card rounded-xl border hover:shadow-lg transition-all overflow-hidden group h-full"
                        >
                          <div className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">
                                {post.category}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock size={12} /> {post.read_time} min read
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                              {post.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {post.published_at
                                  ? new Date(post.published_at).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : ""}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Eye size={12} /> {(post.views_count || 0).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Heart size={12} /> {post.likes_count || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {rest.length > 0 && (
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-6">{pageLabel(page, "moreHeading", "More Articles")}</h2>
                  <div className="space-y-4">
                    {rest.map((post, i) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          to={`/blog/${post.slug}`}
                          className="flex items-center gap-6 bg-card rounded-xl border p-5 hover:shadow-md transition-all group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium text-accent">{post.category}</span>
                              <span className="text-xs text-muted-foreground">• {post.read_time} min read</span>
                            </div>
                            <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">{post.excerpt}</p>
                          </div>
                          <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary shrink-0" />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {posts.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {page.customLabels.emptyStateText || "No blog posts yet."}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <PageFaqSection faqs={page.faqs} />

      {page.ctaHeading && (
        <section className="bg-gold-light py-14">
          <div className="container text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">
              {page.ctaHeading}
            </h2>
            {page.ctaDescription && (
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{page.ctaDescription}</p>
            )}
            <Link
              to={page.ctaPrimaryLink || "/book"}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-lg hover:opacity-90"
            >
              {page.ctaPrimaryLabel || "Book Appointment"} <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
