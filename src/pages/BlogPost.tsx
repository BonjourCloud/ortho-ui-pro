import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Eye, Heart, Share2, Calendar } from "lucide-react";
import { blogPosts } from "@/data/mockData";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

export default function BlogPost() {
  const { slug } = useParams();
  const { config } = useSiteConfig();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <section className="py-20">
        <div className="container text-center">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Post Not Found</h1>
          <Link to="/blog" className="text-primary font-medium">← Back to Blog</Link>
        </div>
      </section>
    );
  }

  const related = blogPosts.filter((p) => p.id !== post.id).slice(0, 2);

  return (
    <>
      <section className="bg-hero-gradient py-14 md:py-20">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/blog" className="inline-flex items-center gap-1 text-primary-foreground/70 text-sm mb-4 hover:text-primary-foreground">
              <ArrowLeft size={14} /> Back to Blog
            </Link>
            <span className="block text-accent text-sm font-semibold mb-2">{post.category}</span>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(post.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> {post.readTime} min read</span>
              <span className="flex items-center gap-1"><Eye size={14} /> {post.viewsCount.toLocaleString()} views</span>
              <span className="flex items-center gap-1"><Heart size={14} /> {post.likesCount}</span>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            {/* Author */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                {config.logoInitials}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{config.doctorName}</div>
                <div className="text-xs text-muted-foreground">Orthopedic Surgeon</div>
              </div>
              <button className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                <Share2 size={14} /> Share
              </button>
            </div>

            {/* Content */}
            <article className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: post.content }} />

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs font-medium bg-secondary text-secondary-foreground rounded-full px-3 py-1">{tag}</span>
              ))}
            </div>
          </motion.div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <h3 className="font-display text-xl font-bold text-foreground mb-4">Related Articles</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {related.map((r) => (
                  <Link key={r.id} to={`/blog/${r.slug}`} className="bg-card rounded-xl border p-5 hover:shadow-md transition-all group">
                    <span className="text-xs font-medium text-accent">{r.category}</span>
                    <h4 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors mt-1">{r.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{r.readTime} min read</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
