# How the Knowledge Library works

This guide has two parts. The first establishes what it takes for a conversation with an AI to affect a person. The second walks through the library in five steps, the same five steps, with the same names, as the [introduction page](/).

Three companion documents go with it, in this order. The evaluation guide, [How an evaluation uses the Knowledge Library](/guide/evaluation), follows a test from start to finish and shows what the Toolkit takes from the library at each step. The [reference](/guide/reference) describes everything in the catalog, including the parts that are defined but not yet filled in. The [glossary](/guide/glossary) defines every term and every value a field can take.

## Actors, interaction, impact

To understand how AI affects a person's mental health and wellbeing, we start with three ingredients, each one needed before the next.

- Actors: there has to be a person and an AI system.
- Interaction: they have to interact. The person uses the AI, and the AI responds.
- Impact: the interaction has to lead somewhere. We need to know what it does to the person's wellbeing.

The diagram shows how they fit together. The person and the AI system take turns in a conversation, and the conversation leads to an impact. The impact doesn't fall evenly on both sides. It lands on the person, who carries it out of the conversation and into the rest of their life.

![The person and the AI system take turns in a conversation. The conversation leads to an impact on the person's wellbeing, and that impact lands back on the person.](figures/ingredients.svg)

Each actor needs a fuller description: who the person is, and what the AI system is.

### The person

Who the person is has an outsized influence on the impact. People bring their context and situation into a conversation with an AI, sometimes on purpose and sometimes not. Much of it never shows up in the conversation: someone may never mention that they are homeless, and it still matters. A person's context includes their demographics, attitudes, psychological profile, social, financial and physical circumstances, relationships, mental health and clinical presentation. We sort it into three kinds: traits, states and dynamics.

- Traits describe relatively stable facts about the person that rarely change from one interaction to another.
- States describe momentary facts that can change and shift within and across interactions.
- Dynamics describe how the person reacts to certain situations, such as what raises their anxiety or how they take unsolicited advice.

Dynamics are easiest to see in how people ask for help and how they leave. Darius, a widowed retired machinist with long-standing suicidal thoughts, buries the real problem inside practical questions and leaves once the task is done; when he says "I'll report back," it is a goodbye, not a promise to return. Soren, who self-harms but doesn't say so, opens up only gradually, pulls back when the other side sounds alarmed, and engages when met calmly.

The same words can mean completely different things depending on who says them. Nadia is a preschool teacher with contamination OCD who washes her hands 30 to 40 times a day. She says: "I know I'm washing my hands too much, but I just can't stop worrying about the kids getting sick." A colleague says almost the same thing during a real norovirus outbreak at work. If the AI answers "you're being responsible," that is a kind and accurate answer for the colleague. For Nadia, it reinforces the compulsion that is taking over her life. The conversation alone can't tell you which one this is. A human reviewer reading the transcript has the same problem: a review that sees only the conversation is working with the same incomplete picture as the AI.

Context also covers where the person is in their life right now: in treatment, recently discharged from a hospital, or in a stable period.

### The AI system

AI systems differ in four ways that matter here: how they are built, what they are designed for, what the person wants from them, and what they know about the person.

#### How the system is built

There are many foundation models, and each comes with settings that change how it behaves. Some build in randomness, so the same prompt can produce different outputs. How a model is deployed and served matters too: providers such as Azure, Anthropic and AWS have default settings for caching and scaling, and changing them, or leaving them at their defaults, can change what the model says. Products such as ChatGPT or Claude Code then add layers on top of the model that users don't see but do experience: the size of the context window, what the system keeps in memory, how it searches earlier conversations or files, how it coordinates several agents on one task, and how a user's preferences, stated or not, steer it. There is no standard way to build an AI system.

#### What the system is for

AI systems are built for different jobs. Some are companions for entertainment, some are general-purpose assistants, some deliver a specific mental health therapy, and some handle logistics and administration inside mental health care. A system should be evaluated against what it was built to do. A general-purpose chatbot shouldn't be penalized for falling short of a licensed therapist's standards, but a CBT chatbot should follow clinical protocols and deliver evidence-based care, and an entertainment companion should send requests for medical advice to a professional. We hold teachers, parents, religious leaders and therapists to different expectations for the same reason.

The company that deploys the system decides what it is for, and it acts on the person too. It can change, restrict or withdraw the system, or cut a conversation off. The library records these as operator actions. They show up in settings and product changes, not in the transcript.

#### What the person wants from it

People come to the same system for different reasons, and the reason changes what a good response looks like. Someone asking for help writing a message to their therapist wants something different from someone who wants to be listened to at 2am, and both differ from someone testing what the system will say. What brought the person to the conversation today matters too: a breakup, a diagnosis, a sleepless night.

How the person opens the conversation shapes everything after it. An AI can settle on whatever the first message implies and build on it, so later warning signs have to fight that first reading. "Do you know any good hand creams?" has a perfectly good ordinary answer, so a reply can stay on hand care even as the person's compulsions come out. "I've been having intrusive thoughts about harming my baby" has no innocent reading.

#### What the system knows about the person

Some systems remember earlier conversations, hold an intake form, or retrieve facts about the person from elsewhere. Others start every conversation knowing nothing. The same reply can be careful for a system that knows the person's history and careless for one that doesn't. And some things are true of the person that the system is never told.

Knowing more doesn't automatically make the system safer. Background can help an AI notice risk sooner. It can also backfire if the AI acts on it too early, for example by naming self-harm before the person has said it and cutting short a gradual disclosure. The better use of background is to stay alert, not to announce the clinical picture before the person has offered it. What the system knows matters, and so does when it acts on it.

### Being humble about cause and effect

Any claim about how a conversation with an AI affected someone's mental health calls for humility. A conversation is one part of a person's life, and no two conversations are alike. We have anecdotes and cases, but claiming that one isolated interaction caused an outcome still takes a leap of faith.

The interaction also runs both ways, which makes cause and effect harder to separate. The AI's behavior shapes which version of the person shows up. Someone who withdraws when dismissed never withdraws from an AI that validates every turn, and an AI that names a condition early can turn a gradual disclosure into a single exchange. Some of what looks like a difference in how the AI behaved is a difference in who it was effectively talking to.

Harm can also build up across a conversation without any single reply being wrong. A conversation can run a hundred turns in which every response is fine on its own, and still end badly.

Take an example. A person in a mental health crisis, in severe distress, turns to an AI for reassurance about their suicidal thoughts. They mention hopelessness and feeling like a burden, both warning signs, and indirectly ask how to die by suicide. On one hand, the AI may reluctantly oblige. It hedges, adds a warning, and then gives the information. Most people would call that harmful, and we would agree. But even here, the transcript can't tell us what happened next. The person may have found the same information elsewhere, may not have acted on it, or may have acted on it for reasons that began long before this conversation. We can say the AI supplied method information to a person in crisis. We can't prove from the conversation alone that it caused what followed.

On the other hand, the AI may refuse. It says it can't help with that, pastes a crisis line number, and ends its reply. That looks like the safe answer. But this person came looking for reassurance and has just said they feel like a burden. A refusal that skips past everything they said can feel like being turned away again, and it may make them less likely to tell anyone else. The response that looks safe on the page can still leave the person worse off.

Or the AI may decline the request and stay in the conversation: name what the person said, ask about it, and offer something other than what they asked for. This is closer to what a trained clinician would do, and it is the response we would hope for. Even so, we can't promise how it turns out for this person.

In each case, what we can observe is what the AI said. What we care about is what happened to the person, and that is the part we can't see. The rest of this guide is about how the library describes that gap. We come back to this example once the library's parts have been introduced.

## What the library is

The Knowledge Library is a catalog of what is known, and what is suspected, about how AI conversations affect people in psychological distress. Each item in the catalog is an entry. Every entry has an id, a short name, a one-paragraph definition, and fields specific to its kind. The catalog is public and versioned. Each entry breaks what it asserts into claims and lists the published sources that bear on each one.

The library exists so that AI systems can be tested. A test puts a simulated person in conversation with an AI system and then judges what happened. The library supplies the vocabulary for both halves: what kinds of person and situation to simulate, and what to look for in the conversation afterward.

## Questions the library is built to answer

- Is this AI behavior harmful, and for which people, products and situations does it go from fine to dangerous?
- What can talking to an AI actually damage in a person, as distinct from the behaviors that cause it?
- Is the AI making existing symptoms worse, or producing something new?
- Is the AI validating the person's feelings, or their beliefs?
- Which combinations of what the person does and what the AI does cause harm that neither causes alone?
- Which AI behaviors lead to a given harm, through what process, and which of those links have been observed rather than assumed?

## The diagram, in the library

Each part of the diagram at the start of this guide has a counterpart in the library, except one. The step column gives the step of this guide that covers it; the same numbers appear on the diagram. Step 5, how sure we are, applies to every row.

| Step | Part of the diagram | In the library | What one entry says | About how many |
| --- | --- | --- | --- | --- |
| 1 | User behavior: what the person says or does | User behavior | Something the person says or does in the conversation that can be pointed to | {{entries(user_behavior)}} |
| 1 | AI behavior: what the AI says or does | AI behavior | Something the AI does in a reply that can be pointed to | {{entries(ai_behavior)}} |
| 2 | The pathway arrow: may lead to | Pathway | A hypothesis: these behaviors, under these conditions, lead to this impact | {{entries(pathway)}} |
| 3 | The person: who they are and their situation | Context | A fact about the person or the situation that a pathway can depend on | {{entries(context_dimension)}} kinds of fact, {{entries(context_value)}} values |
| 3 | The AI system: how it is built and what it is for | Nothing yet | See "What the library doesn't cover yet" | None |
| 4 | Impact on the person's wellbeing | Impact | An effect on the person's wellbeing, harmful or protective | {{entries(impact)}} |

The library also holds about {{entries(source)|about}} sources (the papers and reports it cites) and the evidence linking each claim to them. Those are covered in step 5.

## How the library is organized

The rest of this guide follows the library in five steps, the same five as the [introduction page](/). The diagram below shows where each step sits; its numbers match the steps.

1. What we can see: behaviors.
2. How behaviors might lead to harm or help: pathways.
3. Who is involved, and in what situation: context.
4. What happens to the person: impacts.
5. How sure we are: evidence.

![Everything the conversation shows is on the left: what the person and the AI say or do. Everything else is not seen in the conversation: context about the person, which decides when a pathway applies; the pathway, a hypothesis that behaviors lead to impacts, sometimes through a named mechanism, toward harm or toward protection; and the impacts. Every link is a claim with its evidence.](figures/library-map.svg)

The steps run from what can be seen in a conversation to what can't, and the kinds of entry are kept separate on purpose. A behavior has to be settled from the transcript alone. If the claim about what a behavior causes were written into the behavior itself, anyone who doubted the claim would have to reject the observation along with it, with no way to agree that something happened while doubting what it did. An impact has to be nameable without the route that led to it, because one harm can come from many routes. And because the claim about cause is its own entry, a pathway can say that the same behavior helps one person and harms another.

An analogy helps, as long as its limits are kept in view. Think of a road accident. (Mechanisms and experience clusters are explained with pathways, in step 2.)

| In a road accident | In the library |
| --- | --- |
| The dashcam footage | Behaviors: what can be seen |
| The investigator's reconstruction of what caused what | A pathway |
| Hydroplaning, a process that causes many accidents | A mechanism |
| The injury | An impact |
| The kind of accident, such as a rear-end collision | An experience cluster |
| A wet road, a 17-year-old driver | Context |

An injury is not an accident, and one accident can cause several injuries while one kind of injury comes from many accidents. The analogy breaks in three places. Harm from a conversation often builds up over many turns rather than happening at once. Nobody can run crash tests on people in distress, so every claim about cause in the library is reasoning about what would happen, not a replayed experiment. And the injuries are usually invisible: no one sees a person's hopelessness deepen.

## Step 1. What we can see: behaviors

What the person and the AI say to each other can be seen. We call each observable act a behavior: a request the person made, a sentence the AI wrote. A behavior isn't the whole truth about the person or the AI, but it is something people can nearly always agree on. Two reviewers reading the same transcript will usually agree that the AI gave a crisis line number before acknowledging what the person said, even if they disagree about whether that was a problem.

A behavior entry, the catalog's record of one behavior, does not say whether the behavior is good or bad. That judgment belongs to pathways, because the same behavior can help one person and harm another.

Take [[kl-000301]]. Whether that helps depends on who is asking and what comes next, so the behavior entry only describes what is on the page.

There is one place where a behavior carries something close to a judgment. {{ai_behaviors.irreversible|Word}} AI behaviors are marked as irreversible: once they happen, no later reply in the conversation can undo the harm, in some cases only for people in particular situations. Supplying method or dosage details for self-harm is one. The expert council, the group of mental health experts who review entries, has not yet approved this marking for any of them.

Every behavior entry has the same parts:

| Part | What it answers |
| --- | --- |
| Definition | What is this behavior? |
| What to look for | What has to be present in the transcript to say it happened? Some behaviors are about something missing, such as no question about a plan after a suicide disclosure; for those, this part says what has to be absent |
| What doesn't count | What looks like this behavior but isn't it? |
| How much conversation is needed | One turn, one turn and its reply, several turns, or more than one conversation |
| How it differs from its neighbors | For behaviors that are easy to confuse, what tells them apart |

Some of the most important user behaviors are easy to miss, because the signal is quiet or the person takes it back. [[kl-000478]] covers someone who comes close to saying they are thinking about suicide, then says they're probably being dramatic and changes the subject. [[kl-000403]] covers a person who suddenly sounds at peace after hours of distress. Writing these down as behaviors is what lets a judge look for them.

A user behavior can also say where it shows up: in how the person writes in the conversation itself, or only in what they report about their life outside it. The second kind is weaker evidence: a transcript can show only that the person said it, not that it happened.

## Step 2. How behaviors might lead to harm or help: pathways

The impact on the person can't be seen in the conversation, and it is much harder to agree on. Whether a conversation deepens someone's hopelessness or helps them reach safety, its real impact unfolds in their life, often long after the conversation ends. Legal cases have shown how hard it is to prove with certainty that a specific AI response caused a specific outcome.

The library needs a way to connect what can be seen to what can't, without implying the connection is certain. That is what a pathway is: a stated, checkable hypothesis that specific behaviors, in specific circumstances, lead to a specific impact. Behaviors are the evidence on the page, pathways are the reasoning, and impacts are what we care about but can't observe directly.

In plain terms, a pathway says: when this person, in this situation, meets this kind of response, this is likely to happen to them. It names the behaviors involved, the conditions under which it applies, and the effect it leads to. Read it as a route: what starts it, what keeps it going, what must be true for it to run, and where it ends.

### The parts of a pathway

Each part of a pathway has a role. A role marks where the part sits in the sequence, not which side acted: the turn that opens the exchange is usually the person's, but in some pathways it is the AI's. Many pathways involve only the AI's behavior: {{pathways.ai_only}} of {{entries(pathway)}} name nothing the person does.

| Role | What it does in the pathway |
| --- | --- |
| Starts it | The behavior that sets the pathway going |
| Opens the exchange | The turn the pathway runs through, most often the person's request or disclosure |
| Draws it out | A behavior that pulls the other side's contribution out of them |
| Keeps it going | Holds a pattern in place once it has started |
| Intensifies it | Makes a running pattern stronger |
| Fails to interrupt it | A response that could have broken the pattern and didn't |
| Condition | A fact about the person or situation that must hold for the pathway to apply. It doesn't act; it decides whether the pathway is in play |

### How the parts combine

| Pattern | What it means |
| --- | --- |
| Direct | One behavior happens and the effect follows |
| Omission | The harm is in what the response leaves out |
| Together | Several behaviors must all happen. Any one alone does not produce the effect |
| Over turns | Behaviors alternate across turns, each setting up the next |
| Loop | Each side's behavior makes the other's more likely |
| Through an intermediate | One behavior raises something, such as the person's trust, and the effect follows from that |
| Chain | One effect becomes the condition for the next |

### Where a pathway leads

A pathway names one or more impacts. For each, it says whether the effect is harmful or protective, and how the effect arrives: something new appears, something existing gets worse, something that was there is held in place, or a benefit that would have happened doesn't. It also says roughly when: immediately, in the short term, or over the long term.

One pathway can point in two directions. For someone in exposure-based treatment, advice to avoid the situation their treatment targets does two things: it brings relief now, and it keeps the avoidance cycle going. [[kl-000055]] leads to momentary relief, right away, and to a stronger symptom cycle, in the short term.

### Mechanisms and experience clusters

A mechanism names a process that keeps a problem going and shows up across many pathways, such as the reassurance cycle, where relief from being reassured is what brings the person back to ask again. A clinician who knows the reassurance cycle spots it in a new patient without working out the pattern again from scratch. A mechanism entry does the same for the library: the process is described once, and every pathway it runs through points to it. An experience cluster groups pathways by what the person goes through, such as being overwhelmed by upsetting material, or losing their grip on what is real. Clusters are used to design tests that cover a kind of experience; a judge never marks one.

### What pathways let you do

- Agree on what happened while disagreeing about its effect. Because the behavior and the claim about its effect are separate entries, a reviewer can accept one and question the other.
- Ask what-if questions. Hold the situation fixed and change the AI's reply: what if it had named what the person disclosed before offering a coping technique? The library records such pairs as contrasts, a kind of entry of their own: two pathways that share the person, the situation and what was said, and differ only in the AI's response, one leading toward harm and one well handled. For example, someone who checks things compulsively asks the AI to do one of their checks: doing it keeps the compulsion going, while declining kindly gives the person practice living with the doubt. {{entries(contrast)|Word}} are written so far, and {{pathways.counterpart_owed}} pathways name a well-handled counterpart that nobody has written yet.
- Name what was missing. An omission pathway says what a response should have contained, so a test can look for an absence, not only for something said.
- Trace a harm's routes. One impact is reached by many pathways, and one behavior can feed several impacts. You can work upstream from a harm to the behaviors worth testing for, or downstream from a behavior to what it may lead to.
- Find the weak link. Each pathway carries its own evidence, so you can see which step of a chain has been studied and which is assumed.

## Step 3. Who is involved, and in what situation: context

Impact is personal. The same reply can steady one person and unsettle another, so a judgment about impact means little without knowing whose conversation it was and what was going on. Context entries record those facts, and pathways use them.

### Context dimensions and values

Context comes in two levels. A context dimension is a kind of fact, such as "current treatment" or "deployment context". A context value is one answer on that dimension, such as [[kl-000600]] on the dimension for the person's mental health presentation.

Dimensions are grouped by what they describe:

| About | Examples |
| --- | --- |
| The person | Mental health presentation, age band, life stage, material resources, current treatment, what they believe the AI is |
| The occasion | What brings them to the conversation now |
| The exchange | What they want from the conversation, how they present themselves, how many conversations they've had with this system |
| The setting | Which product the conversation happens in |

### How context changes a pathway

A pathway uses context as a condition. [[kl-000067]] applies only when the test records that the person is at that risk. When a test records nothing about a condition, the condition counts as unknown, not as met.

Conditions are still rare. Only {{pathways.with_condition}} of {{entries(pathway)}} pathways name one, and they cover a handful of presentations: suicide or self-harm risk, OCD, bipolar disorder, and being in exposure-based treatment. The deployment dimension exists but has no values yet, so every entry currently assumes a general-purpose AI chatbot.

A condition is the simplest way context acts on a pathway. The full set:

| How context acts | Example | In the library today |
| --- | --- | --- |
| Switches a pathway on | Method details given to someone at suicide risk: the pathway applies only when the test records that risk | A condition on the pathway. {{pathways.with_condition}} pathways have one |
| Switches a pathway off | A pathway that holds for everyone except people in a particular situation | A condition can be negated. No pathway uses this yet |
| Sends the same reply down a different path | "You're being responsible" settles a worried colleague and feeds Nadia's compulsion | A divergence: one reply, several pathways, each selected by a different value of the same context. The entry type exists; none is written yet |
| Flips the direction | The same reply protects one person and harms another | A divergence whose pathways lead in opposite directions. Separately, {{pathways.both_directions}} pathways record both directions without saying which context selects each |
| Changes whether a harm can be undone | Agreeing with a person's hopeless reasoning about themselves is marked irreversible only for people in suicidal crisis or who self-harm | {{ai_behaviors.irreversible_in_situations|Word}} AI behaviors are marked irreversible only under certain conditions |
| Changes the strength | The same route, stronger for one group than another | A note on a divergence, never a field on the pathway itself. None written yet |
| Changes how often someone ends up there | Some groups land in a situation more often than others | A different claim from the rows above. Experience clusters record it as susceptibility |

A divergence is the opposite of a contrast. A contrast holds the situation fixed and changes the AI's response. A divergence holds the response fixed and changes one fact about the person or situation, so the same transcript runs down a different pathway depending on who the person is. Nadia and her colleague are that kind of case. The library can record divergences, but none is written yet.

### What lives in the library, and what lives in the Toolkit

The person described at the start of this guide is split between two places. The library holds the facts about a person that a pathway can depend on, such as age band or current treatment. The Toolkit, which runs the tests, holds how a simulated person is built: their traits, states and dynamics. What the AI is told about the person, and what is deliberately kept from it, also belong to the Toolkit, as settings of a test run rather than facts a pathway turns on. How the Toolkit uses the library to run a test is the subject of the companion document, [How an evaluation uses the Knowledge Library](/guide/evaluation).

## Step 4. What happens to the person: impacts

An impact is an effect on the person's wellbeing, such as [[kl-000023]], [[kl-000030]], [[kl-000025]] or [[kl-000038]]. Most of the {{entries(impact)}} impacts are harms. {{impacts.benefits|Word}} are protective. Impacts cover wellbeing broadly, not only diagnosable harm: feeling dismissed, losing trust in help, leaning on the AI in place of people. A system isn't safe just because it handles a suicide disclosure correctly. Impacts are where pathways end; they are not observed directly in a test.

## Step 5. How sure we are: evidence

Every entry carries an evidence rating that summarizes how well its claims are supported. Each entry makes several claims. Some are essential: without them, the entry doesn't hold. An entry is rated by its weakest essential claim. So if one essential claim has no evidence, the entry is rated as having none, even if its other claims are well supported. Each entry also carries the evidence itself: each claim, the sources that bear on it, and what each source does and doesn't show. Many claims have no source attached yet: about {{claims.unsourced|about}} of roughly {{claims.total|about}}.

:::values Standing scale
:::

Evidence borrowed from clinical work counts for less. A study of therapists, or of a different kind of exposure, can make a claim about AI plausible, but it doesn't show the thing happens with AI. The library rates such claims "based on clinical practice" at most. Our own earlier work never counts as evidence.

A few ratings sit outside that scale: an entry defined only by how it differs from other entries, an entry approved by the expert council, a documented company action such as a policy change, and a claim that is testable but that no study has measured yet.

Most of the library sits at the bottom of the scale. Of the roughly {{entries(*)|about}} entries that aren't sources, {{share(standing.value, plausible_unobserved)}} are rated "plausible, no evidence found yet" and {{share(standing.value, theorized)}} "proposed in published work". Only {{uses(standing.value, observed_in_transcripts)|word}} is rated "seen in real conversations". Most entries are also drafts: written and in the catalog, but not yet reviewed by the expert council. About {{entries.reviewed}} have been reviewed.

Where reviewers disagree, the entry records the disagreement and is published anyway. {{field(*, contested)|Word}} entries carry an open dispute. For example, [[kl-000017]] records that it is unsettled whether AI conversations can create new delusional beliefs or only strengthen ones the person already had.

We publish the library in this state on purpose. A pathway is a hypothesis, and the catalog says how far each one has been tested. Researchers can see exactly where evidence is missing.

## Putting it together: following the example

Back to the person in crisis who indirectly asks for instructions. The library has entries for the person's side, for several ways the AI might respond, and for where each response may lead.

The person's side:

- [[kl-000477]]: the person asks for method or lethality information and gives an unrelated reason, such as a school project, while distress about their own life appears elsewhere in the conversation. If they ask outright, the entry is [[kl-000406]].
- The context value [[kl-000600]] records where they are.

Four ways the AI might respond, and what the library says about each:

| The AI's response | Pathway | Where it leads |
| --- | --- | --- |
| Gives the method details it was asked for | [[kl-000742]] | Higher suicide or self-harm risk; an existing risk gets worse |
| Agrees with the person that they are a burden, or that nothing will change | [[kl-000051]] | Higher suicide or self-harm risk |
| Opens with a crisis line before acknowledging what the person said | [[kl-000084]] (this one also needs the person to have said it for the first time) | Both directions: the person may feel dismissed, and the referral may still help them reach safety |
| Names what the person said, asks about it, and declines the method information while staying in the conversation | [[kl-000046]] | Crisis averted, or a safer alternative taken up |

A fifth pathway covers what is missing from a reply rather than what is in it: [[kl-000287]]. A response can be warm and include resources and still never ask whether the person has a plan or access to means.

The third row of the table shows why behaviors are kept neutral. A referral is good content. Placed first, in answer to something said for the first time, it can also land as a brush-off. The library records both possibilities rather than calling the referral good or bad.

The pattern in Nadia's case, from the start of this guide, is in the library as [[kl-000053]]. It leads in two directions at once: momentary relief, and a stronger hold for the cycle of doubt and checking. The relief is not a side effect; it is why the person asks again. The library captures the pattern through what the person does in the conversation, a request for confirmation about a feared matter, rather than through a diagnosis. The link from the AI's answer to the stronger cycle rests on clinical research about OCD, not on studies of AI.

None of these six pathways is well evidenced yet. {{rated(theorized, kl-000742, kl-000051, kl-000084, kl-000046, kl-000287, kl-000053)|Word}} are rated "proposed in published work", and {{rated(plausible_unobserved, kl-000742, kl-000051, kl-000084, kl-000046, kl-000287, kl-000053)|word}} "plausible, no evidence found yet". Each entry says so, which is the caution about cause and effect from the start of this guide, applied one pathway at a time.

## What the library doesn't cover yet

The library keeps growing as people use it and add to it. Some of what is missing has a place in the library already, waiting to be filled in. Some has no place yet. Each is an opening for contributors.

### Defined, but not yet filled in

- Divergences: the same response leading somewhere different for different people. The library can record them; none is written.
- Contrasts: {{entries(contrast)|word}} are written. {{pathways.counterpart_owed}} pathways name a well-handled counterpart that nobody has written as its own pathway yet.
- Conditions. Only {{pathways.with_condition}} of {{entries(pathway)}} pathways say which people they apply to. No pathway yet switches off for a particular group, and none says a route is stronger for one group than another.
- Differences by deployment. The deployment dimension has no values yet, so every entry assumes a general-purpose chatbot. No pathway yet says how expectations change for a companion app, a therapy product or an administrative agent.
- Missing behaviors. {{parts.owed|Word}} parts of pathways name a behavior that has no entry yet.
- Mechanisms. {{entries(mechanism)|Word}} are written, and only {{pathways.with_mechanism}} pathways name one.
- Operator actions. {{entries(operator_action)|Word}} are written.
- Irreversibility. {{ai_behaviors.irreversible|Word}} AI behaviors are marked as harms no later reply can undo. The expert council hasn't approved any of these markings.
- Measurement. {{field(*, measurement)}} entries say what an instrument would need to do to measure them, because none does yet.
- Experience clusters. {{pathways.cluster_candidate}} pathways are flagged as possible members of a cluster, and what exactly makes a group of pathways one cluster is still unsettled.
- Evidence. Most pathways are untested hypotheses, and most links from pathways to impacts are specified rather than measured. Studies in real conversations would move the ratings.
- Review. Most entries haven't been reviewed by the expert council yet.

### Not in the library

- How the AI system is built. Model choice, settings, memory and the harness around the model all change behavior. A test run fixes them and records them.
- Harm that builds up over time. The library can write down a claim that a pattern across many turns or sessions causes harm, but nothing yet demonstrates one.
- How to score a result. What to count, how heavily to weigh it, and where to set a pass mark belong to whoever runs the test.
