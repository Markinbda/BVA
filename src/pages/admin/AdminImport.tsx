import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const AdminImport = () => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setProgress(10);
    setResult(null);
    setError(null);

    try {
      setProgress(30);

      const { data, error: fnError } = await supabase.functions.invoke("wp-import");

      setProgress(90);

      if (fnError) {
        setError(fnError.message);
        return;
      }

      if (data?.success) {
        setResult(data.results);
      } else {
        setError(data?.error || "Import failed");
      }
    } catch (e: any) {
      setError(e.message || "Unexpected error");
    } finally {
      setProgress(100);
      setImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WordPress Import</h1>
          <p className="text-muted-foreground mt-1">
            Import news articles, events, and images from bva.bm
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import from WordPress</CardTitle>
            <CardDescription>
              This will scrape content from bva.bm and import it into your database. 
              Existing seed data will be replaced. Images will be downloaded and stored in your media library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleImport} 
              disabled={importing}
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import from WordPress
                </>
              )}
            </Button>

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground">
                  Scraping WordPress site and importing content...
                </p>
              </div>
            )}

            {result && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Import Complete</span>
                </div>
                <ul className="text-sm text-green-600 dark:text-green-500 space-y-1 ml-7">
                  <li>{result.news} news articles imported</li>
                  <li>{result.events} events imported</li>
                  <li>{result.images} images uploaded</li>
                </ul>
                {result.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-amber-600">Warnings:</p>
                    <ul className="text-xs text-amber-600 space-y-1 ml-7">
                      {result.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Import Failed</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-500 mt-1 ml-7">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminImport;
