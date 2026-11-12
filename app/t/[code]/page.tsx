import JoinClient from './JoinClient'

// Personal invite link: camrhia.com/t/TEAMCODE
export default async function TeamLink(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params
  return <JoinClient code={code} />
}
