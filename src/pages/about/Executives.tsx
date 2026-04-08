import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

type Member = {
  name: string;
  role: string;
  photo?: string;
};

const board: Member[] = [
  { name: "Juanita Blee", role: "Chairman & Director", photo: "/executives/Juanita_Bless.jpeg" },
  { name: "Lisa LeBlanc", role: "Co-President & Director", photo: "/executives/Lisa_Leblanc.jpeg" },
  { name: "Brandon Sousa", role: "Co-President & Director", photo: "/executives/Brandon_Sousa.jpg" },
  { name: "Amy Chan", role: "Past President & Director", photo: "/executives/Amy_Chan.jpeg" },
  { name: "Lori Gazzard", role: "Director", photo: "/executives/Lori_Gazzard.jpeg" },
];

const executive: Member[] = [
  { name: "Lisa LeBlanc", role: "Co-President", photo: "/executives/Lisa_Leblanc.jpeg" },
  { name: "Brandon Sousa", role: "Co-President", photo: "/executives/Brandon_Sousa.jpg" },
  { name: "Megan Woods", role: "Secretary" },
  { name: "Teresa Gallant", role: "Treasurer", photo: "/executives/Teresa_Gallant.jpg" },
  { name: "John Ewles", role: "Co-Vice President, Leagues & Tournaments", photo: "/executives/John_Ewles.jpg" },
  { name: "Charlene Place", role: "Co-Vice President, Leagues & Tournaments", photo: "/executives/Charlene_Place.jpg" },
  { name: "Sharri Weldon", role: "Vice President, Marketing & Merchandise", photo: "/executives/Shari_Weldon.jpg" },
  { name: "Libby Sousa", role: "Vice President, Memberships", photo: "/executives/Libby_Sousa.png" },
  { name: "Gary LeBlanc", role: "National Team Chairperson", photo: "/executives/Gary_Leblanc.jpeg" },
  { name: "Lesley Blackburn-Collette", role: "Youth Development Officer", photo: "/executives/Lesley_Blackburn.jpg" },
  { name: "Ryan De Jesus", role: "Referee Commission Chair", photo: "/executives/Ryan_DeJesus.jpg" },
  { name: "VACANT", role: "Coaching Commissioner" },
  { name: "Mark Hamilton", role: "Website & IT", photo: "/executives/Mark_Hamilton.jpg" },
];

const nationalTeam: Member[] = [
  { name: "Gary LeBlanc", role: "National Team Program Chair", photo: "/executives/Gary_Leblanc.jpeg" },
  { name: "Mike Smith", role: "Men's Team Head Coach" },
  { name: "Andrew Soares", role: "Junior Boys Head Coach" },
  { name: "Tyler Seise", role: "MNT Player Representative" },
  { name: "Sharri Weldon", role: "WNT Player Representative", photo: "/executives/Shari_Weldon.jpg" },
  { name: "VACANT", role: "Women's Team Head Coach" },
  { name: "VACANT", role: "Junior Girls Coach" },
];

const additional: Member[] = [
  { name: "Kamryn Martins", role: "Accounts Payable" },
  { name: "Braedon Madeiros Cooke", role: "Events Manager" },
  { name: "Cailey Longworth", role: "Equipment Manager" },
  { name: "Benjamin Barnett", role: "Assistant Equipment Manager" },
  { name: "Floriefe \"Fhe\" Nery", role: "Assistant Referee" },
  { name: "Khianda Pearman-Watson", role: "Leagues & Tournament Sponsorships" },
];

// Photo card — used for Board of Directors
const PhotoCard = ({ member, delay }: { member: Member; delay: number }) => (
  <div
    className="flex flex-col items-center gap-3 opacity-0 animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="relative h-32 w-32 overflow-hidden rounded-full border-4 border-accent/20 bg-muted shadow-md">
      {member.photo ? (
        <img
          src={member.photo}
          alt={member.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10">
          <User className="h-12 w-12 text-primary/30" />
        </div>
      )}
    </div>
    <div className="text-center">
      <p className={`font-heading font-semibold ${member.name === "VACANT" ? "italic text-muted-foreground" : ""}`}>
        {member.name}
      </p>
      <p className="text-sm text-muted-foreground">{member.role}</p>
    </div>
  </div>
);

// Row card — used for other committees
const MemberRow = ({ member }: { member: Member }) => (
  <div className="flex items-center gap-4 py-3 border-b last:border-0">
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-accent/20 bg-muted">
      {member.photo ? (
        <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10">
          <User className="h-5 w-5 text-primary/30" />
        </div>
      )}
    </div>
    <div className="flex flex-1 items-center justify-between min-w-0">
      <span className={`font-medium truncate ${member.name === "VACANT" ? "italic text-muted-foreground" : ""}`}>
        {member.name}
      </span>
      <span className="ml-4 text-sm text-muted-foreground text-right shrink-0 max-w-[55%]">{member.role}</span>
    </div>
  </div>
);

const CommitteeList = ({ title, members, delay }: { title: string; members: Member[]; delay: number }) => (
  <Card className="opacity-0 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
    <div className="h-1 bg-accent" />
    <CardHeader>
      <CardTitle className="font-heading text-xl uppercase">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-6 pb-6">
      {members.map((m) => (
        <MemberRow key={m.name + m.role} member={m} />
      ))}
    </CardContent>
  </Card>
);

const Executives = () => {
  return (
    <Layout>
      <PageHeader title="Board & Committees" subtitle="The people who make BVA happen" />
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-12">

        {/* Board of Directors — photo grid */}
        <section className="opacity-0 animate-fade-in">
          <div className="mb-1 h-1 w-12 rounded bg-accent" />
          <h2 className="mb-8 font-heading text-2xl font-bold uppercase">Board of Directors</h2>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-5">
            {board.map((m, i) => (
              <PhotoCard key={m.name + m.role} member={m} delay={100 + i * 80} />
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            To add photos, place images in <code className="bg-muted px-1 rounded">public/executives/</code> and set the <code className="bg-muted px-1 rounded">photo</code> field to <code className="bg-muted px-1 rounded">/executives/filename.jpg</code>
          </p>
        </section>

        {/* Other committees */}
        <CommitteeList title="BVA Executive Committee" members={executive} delay={500} />
        <CommitteeList title="National Team Committee" members={nationalTeam} delay={600} />
        <CommitteeList title="Additional Committee Members" members={additional} delay={700} />
      </div>
    </Layout>
  );
};

export default Executives;
