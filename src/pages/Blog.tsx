import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Clock, Eye, Heart, ArrowRight } from "lucide-react";
import { blogPosts } from "@/data/mockData";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function Blog() {
  const { config } = useSiteConfig();
  const featured = blogPosts.filter((p) => p.isFeatured);
  const rest = blogPosts.filter((p) => !p.isFeatured);

  return (
    <>
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Knowledge Hub</span>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mt-2 mb-3">Blog & Health Tips</h1>
            <p className="text-primary-foreground/70 max-w-lg mx-auto">Expert orthopedic insights from {config.doctorName}</p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="container">
          {/* Featured */}
          {featured.length > 0 && (
            <div className="mb-12">
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">Featured Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((post, i) => (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <Link to={`/blog/${post.slug}`} className="block bg-card rounded-xl border hover:shadow-lg transition-all overflow-hidden group h-full">
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-3 py-1">{post.category}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={12} /> {post.readTime} min read</span>
                        </div>
                        <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">{post.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.excerpt}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye size={12} /> {post.viewsCount.toLocaleString()}</span>
                            <span className="flex items-center gap-1"><Heart size={12} /> {post.likesCount}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Rest */}
          {rest.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-6">More Articles</h2>
              <div className="space-y-4">
                {rest.map((post, i) => (
                  <motion.div key={post.id} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/blog/${post.slug}`} className="flex items-center gap-6 bg-card rounded-xl border p-5 hover:shadow-md transition-all group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-accent">{post.category}</span>
                          <span className="text-xs text-muted-foreground">• {post.readTime} min read</span>
                        </div>
                        <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">{post.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{post.excerpt}</p>
                      </div>
                      <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary shrink-0" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
