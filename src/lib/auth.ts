import { supabase } from "./supabaseClient";
import { getSignupAppFromPath } from "./abVariant";

export type ExchangeStatusDb = "pre_departure" | "abroad" | "finished";
export type GenderUi = "여" | "남" | "기타" | "선택안함";
export type GenderDb = "male" | "female" | "other" | "na";

export const EXCHANGE_STATUS_OPTIONS: { label: string; value: ExchangeStatusDb }[] = [
  { label: "교환 출국 전", value: "pre_departure" },
  { label: "교환국 체류중", value: "abroad" },
  { label: "교환생활 종료", value: "finished" },
];

export const GENDER_OPTIONS: { label: string; value: GenderUi }[] = [
  { label: "선택안함", value: "선택안함" },
  { label: "여", value: "여" },
  { label: "남", value: "남" },
  { label: "기타", value: "기타" },
];

const GENDER_MAP: Record<GenderUi, GenderDb> = {
  여: "female",
  남: "male",
  기타: "other",
  선택안함: "na",
};

export async function signUpWithProfile(params: {
  email: string;
  password: string;
  fullName: string;
  gender: GenderUi;              // ✅ UI 값으로 받기
  age: number;
  exchangeStatus: ExchangeStatusDb;
}) {
  const { email, password, fullName, gender, age, exchangeStatus } = params;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("User not created");

  const signupApp = getSignupAppFromPath(window.location.pathname);

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    email,
    full_name: fullName,
    gender: GENDER_MAP[gender],     // ✅ DB 허용값으로 변환
    age,
    exchange_status: exchangeStatus,
    signup_app: signupApp,
  });

  if (profileError) throw profileError;

  return user;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
