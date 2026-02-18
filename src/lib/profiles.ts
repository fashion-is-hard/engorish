import { supabase } from "./supabaseClient";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  gender: string;
  age: number;
  exchange_status: string;
  signup_app: string;
};

export async function getMyProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,gender,age,exchange_status,signup_app")
    .single();

  if (error) throw error;
  return data as Profile;
}
