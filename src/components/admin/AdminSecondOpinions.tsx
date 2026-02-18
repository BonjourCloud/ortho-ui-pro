import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Eye } from "lucide-react";

interface SecondOpinion {
  id: string;
  name: string;
  age: number;
  phone: string;
  email: string | null;
  condition: string;
  current_diagnosis: string;
  additional_notes: string | null;
  file_names: string[] | null;
  status: string | null;
  created_at: string | null;
}

export default function AdminSecondOpinions() {
  const [items, setItems] = useState<SecondOpinion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("second_opinions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleDownload = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from("second-opinion-reports")
      .createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const getFileName = (path: string) => path.split("/").pop() || path;

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading submissions…</div>;
  }

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="p-5 border-b">
        <h3 className="font-display font-semibold text-foreground">Second Opinion Submissions</h3>
        <p className="text-xs text-muted-foreground mt-1">{items.length} total submissions</p>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-12 text-center text-muted-foreground">No submissions yet.</div>
      ) : (
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-foreground">{item.name}, {item.age} yrs</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.phone} {item.email && `• ${item.email}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium rounded-full px-3 py-1 ${
                    item.status === "reviewed" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"
                  }`}>
                    {item.status || "pending"}
                  </span>
                  {item.created_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Condition:</span>{" "}
                  <span className="text-foreground">{item.condition}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Diagnosis:</span>{" "}
                  <span className="text-foreground">{item.current_diagnosis}</span>
                </div>
              </div>

              {item.additional_notes && (
                <p className="text-sm text-muted-foreground italic">"{item.additional_notes}"</p>
              )}

              {item.file_names && item.file_names.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.file_names.map((filePath, i) => (
                    <button
                      key={i}
                      onClick={() => handleDownload(filePath)}
                      className="inline-flex items-center gap-1.5 text-xs bg-secondary text-secondary-foreground rounded-lg px-3 py-1.5 hover:bg-secondary/80 transition-colors"
                    >
                      <Download size={12} />
                      {getFileName(filePath)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
