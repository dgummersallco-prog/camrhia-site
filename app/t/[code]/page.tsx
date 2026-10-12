import { redirect } from "next/navigation"

// Short team link: camrhia.com/t/TEAMCODE -> affiliate signup with the team code filled in.
export default async function TeamLink(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params
  redirect(`/affiliate/signup?recruit=${encodeURIComponent(code)}`)
}
