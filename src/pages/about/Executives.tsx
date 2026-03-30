import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const board = [
  { name: "Juanita Blee", role: "Chairman & Director" },
  { name: "Lisa LeBlanc", role: "Co-President & Director" },
  { name: "Brandon Sousa", role: "Co-President & Director" },
  { name: "Amy Chan", role: "Past President & Director" },
  { name: "Lori Gazzard", role: "Director" },
];

const executive = [
  { name: "Lisa LeBlanc", role: "Co-President" },
  { name: "Brandon Sousa", role: "Co-President" },
  { name: "Megan Woods", role: "Secretary" },
  { name: "Teresa Gallant", role: "Treasurer" },
  { name: "John Ewles", role: "Co-Vice President, Leagues & Tournaments" },
  { name: "Charlene Place", role: "Co-Vice President, Leagues & Tournaments" },
  { name: "Sharri Weldon", role: "Vice President, Marketing & Merchandise" },
  { name: "Libby Sousa", role: "Vice President, Memberships" },
  { name: "Gary LeBlanc", role: "National Team Chairperson" },
  { name: "Lesley Blackburn-Collette", role: "Youth Development Officer" },
  { name: "Ryan De Jesus", role: "Referee Commission Chair" },
  { name: "VACANT", role: "Coaching Commissioner" },
  { name: "Mark Hamilton", role: "Website & IT" },
];

const nationalTeam = [
  { name: "Gary LeBlanc", role: "National Team Program Chair" },
  { name: "Mike Smith", role: "Men's Team Head Coach" },
  { name: "Andrew Soares", role: "Junior Boys Head Coach" },
  { name: "Tyler Seise", role: "MNT Player Representative" },
  { name: "Sharri Weldon", role: "WNT Player Representative" },
  { name: "VACANT", role: "Women's Team Head Coach" },
  { name: "VACANT", role: "Junior Girls Coach" },
];

const additional = [
  { name: "Kamryn Martins", role: "Accounts Payable" },
  { name: "Braedon Madeiros Cooke", role: "Events Manager" },
  { name: "Cailey Longworth", role: "Equipment Manager" },
  { name: "Benjamin Barnett", role: "Assistant Equipment Manager" },
  { name: "Floriefe \"Fhe\" Nery", role: "Assistant Referee" },
  { name: "Khianda Pearman-Watson", role: "Leagues & Tournament Sponsorships" },
];

const CommitteeCard = ({ title, members, delay }: { title: string; members: { name: string; role: string }[]; delay: number }) => (
  <Card className="opacity-0 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
    <div className="h-1 bg-accent" />
    <CardHeader>
      <CardTitle className="font-heading text-xl uppercase">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="divide-y">
        {members.map((m) => (
          <div key={m.name + m.role} className="flex justify-between py-3">
            <span className={`font-medium ${m.name === "VACANT" ? "text-muted-foreground italic" : ""}`}>{m.name}</span>
            <span className="text-sm text-muted-foreground text-right max-w-[55%]">{m.role}</span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const Executives = () => {
  return (
    <Layout>
      <PageHeader title="Board & Committees" subtitle="The people who make BVA happen" />
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
        <CommitteeCard title="Board of Directors" members={board} delay={100} />
        <CommitteeCard title="BVA Executive Committee" members={executive} delay={200} />
        <CommitteeCard title="National Team Committee" members={nationalTeam} delay={300} />
        <CommitteeCard title="Additional Committee Members" members={additional} delay={400} />
      </div>
    </Layout>
  );
};

export default Executives;
