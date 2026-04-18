import { formatRegime, formatRelation } from "./format";

function memberLine(member) {
  const parts = [member.firstName];
  const relation = formatRelation(member.relation);
  if (relation) parts.push(relation);
  if (member.age != null) parts.push(`age ${member.age}`);
  const head = parts.join(", ");
  const extras = [];
  if (member.occupation) extras.push(member.occupation);
  if (member.birthplace) extras.push(`born in Co. ${member.birthplace}`);
  return extras.length ? `${head} — ${extras.join("; ")}` : head;
}

export default function PrintRosters({ lines }) {
  return (
    <section className="print-rosters" aria-hidden="true">
      <h2>Households</h2>
      {lines.map((line) => (
        <article key={line.id} className="print-rosters__line">
          <header>
            <h3>{line.label}</h3>
            <p>
              {line.townland}, {line.ded ? `${line.ded}, ` : ""}Co. {line.county}
            </p>
          </header>
          {line.yearRecords.map((record) => (
            <section key={record.year} className="print-rosters__year">
              <h4>
                {record.year}
                <span className="print-rosters__regime">
                  {formatRegime(record.regime)}
                </span>
              </h4>
              <ul>
                {record.members.map((member, index) => (
                  <li key={`${record.year}-${member.firstName}-${index}`}>
                    {memberLine(member)}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </article>
      ))}
    </section>
  );
}
