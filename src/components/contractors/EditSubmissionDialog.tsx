
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const editSubmissionSchema = z.object({
  submission_date: z.string().min(1, "Submission date is required"),
  ad_spend: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Ad spend must be a valid number >= 0"
  }),
  youtube_spend: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "YouTube spend must be a valid number >= 0"
  }).optional(),
  meta_spend: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Meta spend must be a valid number >= 0"
  }).optional(),
  newsbreak_spend: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Newsbreak spend must be a valid number >= 0"
  }).optional(),
  leads: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val)), {
    message: "Leads must be a valid integer >= 0"
  }),
  cases: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val)), {
    message: "Cases must be a valid integer >= 0"
  }),
  revenue: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Revenue must be a valid number >= 0"
  }),
  notes: z.string().optional(),
});

type EditSubmissionFormData = z.infer<typeof editSubmissionSchema>;

interface ContractorSubmission {
  id: string;
  contractor_email: string;
  contractor_name: string;
  campaign_id: string;
  submission_date: string;
  ad_spend: number;
  youtube_spend?: number;
  meta_spend?: number;
  newsbreak_spend?: number;
  leads: number;
  cases: number;
  revenue: number;
  status: string;
  notes: string;
  created_at: string;
  campaigns: {
    name: string;
  };
}

interface EditSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: ContractorSubmission | null;
  onSave: (submissionId: string, data: {
    submission_date: string;
    ad_spend: number;
    youtube_spend?: number;
    meta_spend?: number;
    newsbreak_spend?: number;
    leads: number;
    cases: number;
    revenue: number;
    notes: string;
  }) => Promise<void>;
  isLoading: boolean;
}

export function EditSubmissionDialog({
  open,
  onOpenChange,
  submission,
  onSave,
  isLoading,
}: EditSubmissionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditSubmissionFormData>({
    resolver: zodResolver(editSubmissionSchema),
  });

  React.useEffect(() => {
    if (submission && open) {
      // Handle date string directly to avoid timezone shifts
      const dateString = submission.submission_date.includes('T') 
        ? submission.submission_date.split('T')[0] 
        : submission.submission_date;
      
      reset({
        submission_date: dateString,
        ad_spend: submission.ad_spend.toString(),
        youtube_spend: (submission.youtube_spend || 0).toString(),
        meta_spend: (submission.meta_spend || 0).toString(),
        newsbreak_spend: (submission.newsbreak_spend || 0).toString(),
        leads: submission.leads.toString(),
        cases: submission.cases.toString(),
        revenue: submission.revenue.toString(),
        notes: submission.notes || '',
      });
    }
  }, [submission, open, reset]);

  const onSubmit = async (data: EditSubmissionFormData) => {
    if (!submission) return;

    await onSave(submission.id, {
      submission_date: data.submission_date,
      ad_spend: Number(data.ad_spend),
      youtube_spend: data.youtube_spend ? Number(data.youtube_spend) : 0,
      meta_spend: data.meta_spend ? Number(data.meta_spend) : 0,
      newsbreak_spend: data.newsbreak_spend ? Number(data.newsbreak_spend) : 0,
      leads: Number(data.leads),
      cases: Number(data.cases),
      revenue: Number(data.revenue),
      notes: data.notes || '',
    });
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Submission</DialogTitle>
          <DialogDescription>
            Edit the submission details for {submission.contractor_name} - {submission.campaigns?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="submission_date">Submission Date</Label>
              <Input
                id="submission_date"
                type="date"
                {...register("submission_date")}
              />
              {errors.submission_date && (
                <p className="text-sm text-destructive mt-1">
                  {errors.submission_date.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="ad_spend">Total Ad Spend ($)</Label>
              <Input
                id="ad_spend"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("ad_spend")}
              />
              {errors.ad_spend && (
                <p className="text-sm text-destructive mt-1">
                  {errors.ad_spend.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Platform-Specific Ad Spend</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="youtube_spend">YouTube Spend ($)</Label>
                <Input
                  id="youtube_spend"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("youtube_spend")}
                />
                {errors.youtube_spend && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.youtube_spend.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="meta_spend">Meta Spend ($)</Label>
                <Input
                  id="meta_spend"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("meta_spend")}
                />
                {errors.meta_spend && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.meta_spend.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="newsbreak_spend">Newsbreak Spend ($)</Label>
                <Input
                  id="newsbreak_spend"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("newsbreak_spend")}
                />
                {errors.newsbreak_spend && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.newsbreak_spend.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="leads">Leads</Label>
              <Input
                id="leads"
                type="number"
                min="0"
                placeholder="0"
                {...register("leads")}
              />
              {errors.leads && (
                <p className="text-sm text-destructive mt-1">
                  {errors.leads.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="cases">Cases</Label>
              <Input
                id="cases"
                type="number"
                min="0"
                placeholder="0"
                {...register("cases")}
              />
              {errors.cases && (
                <p className="text-sm text-destructive mt-1">
                  {errors.cases.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="revenue">Revenue ($)</Label>
            <Input
              id="revenue"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("revenue")}
            />
            {errors.revenue && (
              <p className="text-sm text-destructive mt-1">
                {errors.revenue.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-sm text-destructive mt-1">
                {errors.notes.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
