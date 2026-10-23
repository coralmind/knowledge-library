# Reference: everything in the catalog

This page describes every kind of entry in the catalog and every field a reader will meet on an entry page. Field names appear in code style so they can be matched to the catalog files. Counts are of entries that haven't been retired.

## Every kind of entry at a glance

| Kind of entry | What it is | How many | Status | Read by the Toolkit |
| --- | --- | --- | --- | --- |
| AI behavior | Something the AI does in a reply that can be pointed to | {{entries(ai_behavior)}} | In use | Yes, by the judge |
| User behavior | Something the person says or does that can be pointed to | {{entries(user_behavior)}} | In use | Yes, by the judge |
| Operator action | Something the company that deployed the system does, seen outside the transcript | {{entries(operator_action)}} | In use, few written | No |
| Pathway | A hypothesis that behaviors, under conditions, lead to an impact | {{entries(pathway)}} | In use | Yes, by the judge |
| Mechanism | A process that keeps a problem going across many pathways | {{entries(mechanism)}} | In use, named by {{pathways.with_mechanism}} pathways | Yes, shown to the judge as background |
| Experience cluster | A group of pathways sharing what the person goes through | {{entries(experience_cluster)}} | In use; what defines one is unsettled | Yes, shown to the judge as background |
| Contrast | Two pathways in the same situation, one harmful response and one well-handled | {{entries(contrast)}} | In use, few written | No |
| Context dimension | A kind of fact about the person or situation | {{entries(context_dimension)}} | In use | Yes, when checking conditions |
| Context value | One answer on a dimension | {{entries(context_value)}} | In use | Yes, when checking conditions |
| Divergence | Pathways where the same response leads somewhere different depending on one fact about the person or situation | {{entries(divergence)}} | Defined, none written | No |
| Person context | The library's earlier way of recording context | {{entries(context)}} | All retired | No |
| Impact | An effect on the person's wellbeing | {{entries(impact)}} | In use | Only whether a link to it is harmful or protective |
| Source | A paper, report or other work the library cites | About {{entries(source)|about}} | In use | No |

## Fields every entry has

| Field | What it means |
| --- | --- |
| Id (`id`) | A permanent identifier such as `kl-000210`. Use this to cite or store an entry |
| Display id (`display_id`) | A readable handle such as `Pathway-29`. It can change when entries are renamed, so don't store it |
| Label (`label`) | The entry's short name |
| Definition (`definition`) | What must be true for the entry to apply |
| Layer (`layer`) | What kind of thing the entry asserts: something observed, a judgment about what follows, a process, a fact about context, or an operator's act |
| Status (`lifecycle`) | Draft (written, not yet reviewed by the expert council), reviewed (stored as `active`), or retired (stored as `deprecated`, and kept so the id still works). It also records since when, and which entries replaced a retired one |
| Also known as (`aliases`) | Other names and older codes for the entry |
| How it differs from its neighbors (`distinguish_from`) | For each entry it is easily confused with, what tells them apart |
| Claims (`claims`) | What the entry asserts, broken into single statements that could each be false |
| Evidence for each claim (`claim_evidence`) | One row for each pairing of a claim with a source. See "How evidence is recorded" below |
| Evidence rating (`standing`) | How well supported the entry is: the rating, why, which claim set it, and when it was last judged |
| Whole-entry citations (`sources`) | Sources cited for the entry as a whole rather than for one claim, including sources that were read and found to support nothing, or to cut against the entry |
| Open dispute (`contested`) | An unsettled question about whether the entry should exist as written. On {{field(*, contested)|noun:entry}} |
| What it would take to measure (`measurement`) | Where no existing instrument measures the entry, what one would need to do. On {{field(*, measurement)|noun:entry}} |

## How evidence is recorded

Each claim has a kind: that something exists, what defines it, how it differs from a neighbor, how often it happens, that it causes harm or benefit, that it can be detected in a transcript, that it depends on context, that one step of a pathway leads to the next, or how much conversation it takes to see.

Each row linking a claim to a source records the exact quote, where it appears in the source, what it shows for the claim, and, where the source is about a different setting, the reasoning that bridges the gap. It also records two judgments about the source: how close it is to the claim (`fit`), and what it does for the claim (`contributes`). Both are defined in the glossary under "How close the source is" and "What the source does for the claim". Two rules matter most for reading the evidence: a source from a different domain, such as clinical work between people, is never evidence that something happens with AI, and the library's own earlier work is never evidence at all.

An entry's evidence rating is the rating of the weakest of its essential claims, the claims it cannot do without. The ratings are described in step 5.

## AI behaviors

[Browse the {{entries(ai_behavior)}} AI behaviors →](/catalog?type=ai_behavior)

| Field | What it means |
| --- | --- |
| What to look for (`observable_criteria`) | What must be present in the AI's reply for the behavior to count |
| What must be missing (`absence_criteria`) | Used instead of the above when the behavior is an omission |
| What doesn't count (`exclusions`) | Look-alikes that are not this behavior |
| How much conversation is needed (`detection_window`) | The least that can show it: one turn, one turn and its reply, several turns, or more than one conversation |
| Groups (`groups`) | Themes used to organize behaviors. Some group names still carry a verdict, such as `obsessional-cycle-collusion` |
| Irreversible (`irreversibility`) | Marked when no later reply in the conversation can undo the harm, either everywhere or only for people in named situations, with whether the expert council has approved the marking. On {{field(ai_behavior, irreversibility)|noun:behavior}}; none approved |
| Defined against (`reference_behavior`) | A named counterpart this behavior is partly defined by contrast to. On {{field(ai_behavior, reference_behavior)|noun:behavior}} |

## User behaviors

[Browse the {{entries(user_behavior)}} user behaviors →](/catalog?type=user_behavior)

The same fields as AI behaviors, except the last two, plus:

| Field | What it means |
| --- | --- |
| Where it shows up (`detectable_from`) | In how the person writes in the conversation, or only in what they report about their life. A reported state is not an observation of that state |
| What kind of thing it is (`person_state_kind`) | A process, a pattern of behavior, or a state. Set on {{field(user_behavior, person_state_kind)|noun:behavior}} |
| Often seen with (`condition_tags`) | Context values this behavior often appears alongside. A hint for building realistic simulated people, not a condition: the behavior counts whatever the person's context |
| Symptom classification (`conceptual_group`, `cluster_primary`, `cluster_secondary`, `pattern_type`) | Older classification labels on {{field(user_behavior, conceptual_group)|noun:symptom behavior}} |

## Operator actions

[Browse the {{entries(operator_action)}} operator actions →](/catalog?type=operator_action)

An operator action is something the company that deployed the system does: changing, restricting or withdrawing the system, or ending a conversation for its own reasons. The transcript doesn't show it; it is documented in changelogs, terms-of-service changes, version strings and announcements. It records the act as a risk rather than a harm (`valence`), who acted (`actor`), where the act is documented (`observable_from`), and named variants of the act (`forms`). Two are written.

## Pathways

[Browse the {{entries(pathway)}} pathways →](/catalog?type=pathway)

| Field | What it means |
| --- | --- |
| Parts (`composition_parts`) | The behaviors and context values the pathway is built from. Each has a role (see step 2). A part can say the behavior must not occur. A part with no behavior entry yet is marked owed, with a note on what the missing entry would need to say; {{parts.owed|noun:part}} are owed |
| How the parts combine (`composition_type`) | Direct, omission, together, over turns, loop, through an intermediate, or chain (see step 2) |
| Instruction for the judge (`composition_instruction`) | What the pattern and roles can't express, in plain words |
| Where it leads (`impacts`) | One or more links to impacts. See the next table |
| Mechanisms (`mechanisms`) | Mechanism entries said to drive the pathway. On {{field(pathway, mechanisms)|noun:pathway}} |
| Proposed mechanism (`mechanism_hypothesis`) | A mechanism suggested but not yet written as an entry. On {{field(pathway, mechanism_hypothesis)|noun:pathway}} |
| Candidate cluster (`experience_cluster_candidate`) | An experience cluster the pathway may belong to. On {{field(pathway, experience_cluster_candidate)|noun:pathway}} |
| Well-handled counterpart (`counterpart_owed`) | The good response this pathway implies, which nobody has yet written as its own pathway. On {{field(pathway, counterpart_owed)|noun:pathway}}. Each could become a contrast once the counterpart is written |
| In between (`mediators`) | Something that sits between the behavior and the outcome, such as the person's trust. On {{field(pathway, mediators)|noun:pathway}} |
| What it feeds (`downstream`) | What this pathway's impact goes on to cause. On {{field(pathway, downstream)|noun:pathway}} |
| Timing (`temporal`) | Timing beyond how soon the impact follows. On {{field(pathway, temporal)|noun:pathway}} |
| Open questions | Notes on what the evidence rating should be (`standing_minimum_question`, on {{field(pathway, standing_minimum_question)|noun:pathway}}), and on where the pathway may compete with treatment the person already receives (`treatment_competition_concern`, on {{field(pathway, treatment_competition_concern)|noun:pathway}}) |

Each link from a pathway to an impact records:

| Field | What it means |
| --- | --- |
| Direction (`sign`) | Harmful or protective. A pathway whose links point in two directions is mixed |
| How it arrives (`onset_mode`) | Something new, something existing made worse, something held in place, or a benefit that doesn't happen |
| How soon (`horizon`) | Immediately, in the short term, or over the long term |
| Whose outcome (`level_of_analysis`) | This person, or a rate across a group. A finding about a group does not show what happens to one person |
| Where the link comes from (`basis_kind`) | How the step from pathway to impact was arrived at. See below |
| Passages (`evidence`) | Quoted cases from sources that bear on the link |

Most links from pathways to impacts are specified, not measured:

| Where the link comes from | Meaning | Links |
| --- | --- | --- |
| Project specification | Derived from our own specification work | {{uses(body.impacts[].basis_kind, SPEC_CLAIM)}} |
| Transferred | Carried over from clinical or pre-AI research | {{uses(body.impacts[].basis_kind, TRANSFER)}} |
| Asserted | Stated with no outside support | {{uses(body.impacts[].basis_kind, ASSERTED)}} |
| Sourced, with a quote | Backed by a verbatim quote from a source | {{uses(body.impacts[].basis_kind, SOURCED_QUOTE)}} |
| Framing | Rests on a conceptual framing, not a finding | {{uses(body.impacts[].basis_kind, FRAME)}} |
| Sourced | Backed by a cited source | {{uses(body.impacts[].basis_kind, SOURCED)}} |
| Vocabulary | Follows from the library's own definitions | {{uses(body.impacts[].basis_kind, VOCAB)}} |

## Mechanisms

[Browse the {{entries(mechanism)}} mechanisms →](/catalog?type=mechanism)

| Field | What it means |
| --- | --- |
| Kind of process (`process_kind`) | What sort of process is claimed |
| Compared against (`comparison_object_kinds`) | What the process is judged against: the alternative it is measured from |
| Time span (`operates_over`) | How long the process needs to run, which may be longer than any one behavior |
| Runs through (`instances`) | The behaviors the mechanism works through, and whether each is part of its definition or one example |
| Helps sustain (`maintains`) | Clinical conditions the mechanism is said to keep going |
| When it reverses (`flip_condition`) | The circumstance in which the process runs the other way. On {{field(mechanism, flip_condition)|noun:mechanism}} |

## Experience clusters

[Browse the {{entries(experience_cluster)}} experience clusters →](/catalog?type=experience_cluster)

| Field | What it means |
| --- | --- |
| Membership test (`identity_criterion`) | What makes a pathway belong to the cluster |
| Time course (`time_course`) | How long the experience runs and what shape it takes |
| Made of (`composed_of`) | The pathways in the cluster, each with its part in the story |
| Who is more susceptible (`susceptibility`) | Groups that end up in this experience more often |
| Overlaps (`cross_listing`) | Other clusters this one overlaps, and where the line is |
| Design-time only (`design_time_only`) | Clusters are used to design tests. A judge never marks one |

## Contrasts

[Browse the {{entries(contrast)}} contrasts →](/catalog?type=contrast)

A contrast pairs pathways that share everything except the AI's response: the same person, the same situation, the same thing said. One response leads toward harm and one is well handled. It records the pathways (`members`) and the part of the response that tells them apart (`discriminator`). The four written so far:

- [[kl-000740]]
- [[kl-000739]]
- [[kl-000744]]
- [[kl-000745]]

## Context dimensions and values

[Browse the {{entries(context_dimension)}} context dimensions →](/catalog?type=context_dimension) · [Browse the {{entries(context_value)}} context values →](/catalog?type=context_value)

A dimension records:

| Field | What it means |
| --- | --- |
| About (`about`) | The person, the occasion, the exchange, or the setting. Facts about the person belong to the simulated person; the rest belong to the test case |
| How values are given (`value_space`) | A list of options, an ordered scale (where a condition holds at its level or above), or a free description |
| What counts (`admits`) | For a free-description dimension, what a valid value looks like |
| One or many (`cardinality`) | Whether a test case records one value or several |
| What it changes (`defines`) | What varying this dimension does to a judgment |

A value records which dimension it sits on, its position on an ordered scale (`ordinal`), the number range it covers where it bands a number such as age (`bounds`), and the other values it stands for where it is an umbrella, as [[kl-000741]] stands for [[kl-000600]] and [[kl-000601]] (`covers`). Many values also carry notes for readers: how a transcript can establish the value (`detection_note`), how closely it maps to a recognized clinical category (`category_scope`) and to ICD codes (`icd_codes`), which experience clusters it relates to and why (`experience_clusters`, `cluster_assignment_note`), where it ends and a neighbor begins (`boundary_note`), an example of the response failure it bears on (`example_failure`), and why it is its own entry (`rationale`).

## Divergences

A divergence is the opposite of a contrast. It holds the response fixed and changes one fact about the person or situation, so the same transcript runs down a different pathway depending on who the person is. It records the context dimension that decides (`dimension`), each pathway with the value that selects it (`members`), whether the pathways cover every value on that dimension (`exhaustive`), and, where the same route is stronger for one value, which one (`relative`). None is written yet. One reply that reassures a colleague during a real outbreak and feeds another person's handwashing compulsion is the kind of case one would record.

## Person context (retired)

[Browse the {{entries(context)}} retired person contexts →](/catalog?type=context&s=all)

The library's earlier way of recording context. All {{entries(context)|word}} entries are retired, and their ids still work. Conditions and population factors became context dimensions and values. What the AI was told about the person, facts kept from it, and the traits, states and dynamics of a simulated person moved to the Toolkit as settings of a test run.

## Impacts

[Browse the {{entries(impact)}} impacts →](/catalog?type=impact)

| Field | What it means |
| --- | --- |
| Harm or benefit (`valence`) | {{impacts.harms}} harms, {{impacts.benefits}} benefits |
| Shape (`impact_kind`) | A state, a pattern, or a benefit that didn't happen |
| Area of life (`domain`) | One of six: symptoms, thinking and sense of reality, self-worth and hope, relationships, the experience of the conversation itself, and the person's relationship to help |
| External scheme (`il_layers`) | A cross-reference to an outside way of ranking impacts. Not a link within the library |
| Independent of (`dissociation_claims`) | Where this impact is said to occur without another. On {{field(impact, dissociation_claims)|noun:impact}} |

## Sources

[Browse the {{entries(source)}} sources →](/catalog?type=source)

A source is a work the library cites. It is not an entry with claims of its own; it is the record the evidence rows point to.

| Field | What it means |
| --- | --- |
| Kind (`kind`) | Empirical study, benchmark, review, position paper, measurement instrument, clinical instrument, guidance, policy, or other paper. Most are benchmarks (about {{uses(body.kind, benchmark)|about}}) and empirical studies (about {{uses(body.kind, empirical_study)|about}}) |
| Our own work (`is_internal`) | Set on the project's own documents. These are never evidence |
| Bibliographic details | Title, authors, year, venue, and identifiers such as a DOI or arXiv id (`title`, `authors`, `year`, `venue`, `identifier`, `doi`, `arxiv_id`) |
| Quality grade (`source_quality`) | One grade per work, reused everywhere it is cited. See below |
| Why that grade (`grade_reasoning`) | The reasoning behind the grade |
| Design (`design`, `design_caveat`, `design_fits_own_claims`) | How the study was run, its limits, and whether its design supports what the authors themselves claim |
| Who and what was studied (`n_reported`, `population`, `agent_studied`, `unit_of_analysis`) | Sample size, the population (or none, for studies of models alone), whose conduct was observed, and the unit data was collected over |
| Rigor (`peer_reviewed`, `preregistered`, `replication_status`) | Whether it was peer reviewed, registered in advance, and replicated |
| Conflicts and integrity (`conflicts`, `author_disclosure`, `integrity_flag`) | Declared or apparent conflicts of interest, and any correction or retraction |
| Versions (`other_version`, `canonical_record`) | Another registered version of the same work, and where the authoritative record lives |
| License (`license_status`, `license_terms`) | Whether the work may be redistributed, and under what license |
| Checked (`verified_as_of`) | When the record was last checked against the source |

Grades run from A to D, with "not graded" for works that make no empirical claims; the glossary gives what each grade can support, under "Source grade".

A grade belongs to the work, not to how it bears on a claim: an A-grade study used as an analogy is still weak support for that claim.

## Links between entries

Every connection the viewer draws, such as "made of", "leads to" or "referenced by", is built from the fields above. Nothing else is stored. A few fields name things outside the library and are not drawn as links: the external impact scheme, the conditions a mechanism helps sustain, and the intermediates on a pathway.
