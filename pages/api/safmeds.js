export async function getServerSideProps(){
  return { redirect: { destination: '/safmeds.html', permanent: false } };
}
export default function Safmeds(){ return null; }
