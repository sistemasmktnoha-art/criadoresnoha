import { supabase } from "@/integrations/supabase/client";

export interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

// "faqs" is not in the generated types yet, so access it loosely.
const table = () => (supabase as any).from("faqs");

export async function listFaqs(): Promise<Faq[]> {
  const { data, error } = await table().select("id, question, answer, sort_order").order("sort_order").order("created_at");
  if (error) throw error;
  return (data || []) as Faq[];
}

export async function saveFaq(faq: { id?: string; question: string; answer: string; sort_order?: number }) {
  if (faq.id) {
    const { error } = await table().update({ question: faq.question, answer: faq.answer }).eq("id", faq.id);
    if (error) throw error;
  } else {
    const { error } = await table().insert({ question: faq.question, answer: faq.answer, sort_order: faq.sort_order ?? 999 });
    if (error) throw error;
  }
}

export async function deleteFaq(id: string) {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}
