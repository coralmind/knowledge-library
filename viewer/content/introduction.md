---
title: Knowledge Library
description: How a conversation with an AI can help or harm a person's mental health, traced one step at a time.
---

:::hero

# How a conversation with an AI can help or harm a person's mental health, traced one step at a time

The Knowledge Library synthesizes existing findings, how strong the evidence is for each, where findings agree or conflict, and what important gaps remain.

When people bring distress to an AI system, what it says can help or hurt. This library maps how. It starts from behaviors: things the person or the AI says or does that can be identified in a transcript. A pathway is a hypothesis that specific behaviors, in a specific situation, lead to an effect on the person. Context records the facts about the person and the situation that change a pathway, and impacts are the effects pathways lead to. Each link in a pathway, the step from one part to the next, is a claim that says how strong its evidence is, including when there is none yet.

:::stats

- {{entries(ai_behavior)}} AI behaviors
- {{entries(user_behavior)}} user behaviors
- {{entries(pathway)}} pathways
- {{entries(impact)}} impacts
- {{entries(source)}} sources
:::

:::actions

- [Follow one impact back to the behaviors that may lead to it →](/explore?root=kl-000016&sign=harmful)
- [Browse the catalog](/catalog)
:::

:::type-key
A colored dot beside an entry's name marks its kind:
:::

![In the conversation, which can be seen, the person and the AI take turns. Not seen in the conversation: the person's context, which decides when a pathway applies, and the pathway itself, the claim that the conversation may lead to impacts on the person's wellbeing, harmful or protective. The numbers match the steps below.](figures/overview.svg)

:::step-list
:::

:::

:::start

## Where to start

:::cards doors

### I build evaluations

Pick a harm or a behavior and see every pathway through it, with the parts to detect.

[See how behaviors connect](/explore)

### I want to check the evidence

Start from a source and see every claim it supports, or open any entry's claims.

[Browse sources](/catalog?type=source)

### I'm new to this

A longer walk through how the library works, step by step, with the example it builds on.

[Read the guide](/guide)

### I want to contribute

The library keeps growing as people use it and add to it. If you have expertise, evidence, or an idea for an entry, get in touch.

[Contact us](https://coralmind.org/get-involved?sourceId=KnowledgeLibraryViewer&involve=expertise#connect)
:::
:::

:::step 1 paragraphs=2
The company that deploys the AI system can also change, restrict or withdraw the system, or cut a conversation off. These operator actions show up in settings and product changes, not in the transcript.

Each behavior has written criteria, so that two readers mark the same turns, and exclusions for the cases that look similar but are not.

:::chips DetectionWindow count=body.detection_window
How much conversation is needed
:::

:::aside
:::transcript

- Person: [Asks for help with a work deadline and, in the same message, states an explicit thought of suicide]
- AI: [A warm, fluent reply about managing the deadline. Nothing in it names or asks about the statement]

Schematic, not a real transcript.
:::

:::criteria kl-000205
:::
:::
:::

:::step 2 paragraphs=2

:::aside
Pathways make four things possible:

- Detection. Every part of a pathway is a behavior or a condition you can look for, so a pathway tells an evaluator what to check.
- Testing. Every link in a pathway is a claim with its own evidence, so each step can be supported or challenged on its own.
- What-if questions. What if the AI had answered differently? What if the person's situation were different? What if one part were missing?
- Honesty about inference. Behaviors are observed; the step to impact is a judgment, and it is labeled as one.
:::

:::pathway-graph kl-000055
One pathway can point in two directions. For someone in exposure-based treatment, advice to avoid the situation their treatment targets does two things: it brings relief now, and it keeps the avoidance cycle going. That pathway is [[kl-000055]]. In the graph, the lines from the pathway to its impacts are links: a solid line leads toward harm, and a green dashed line toward protection.
:::

The library records what-if pairs as contrasts: two pathways that differ in one response. Everything else is the same, the person, the situation and what they said, so any difference in where the two pathways lead comes down to the AI's reply. Most pathways describe what goes wrong; a contrast also shows what a better reply looks like. It names the part of the reply that makes the difference, which is exactly what a test should look for, and it turns a vague "the AI should have answered differently" into something specific: what in the reply to fix, and what the fix looks like. For example, [[kl-000745]] pairs doing a compulsive check for the person with kindly declining it. There are {{entries(contrast)|word}} so far.

:::from-guide mechanisms-and-experience-clusters
:::
:::

:::step 3
Said to a colleague worried during a real norovirus outbreak, "you're being responsible" is a kind and accurate answer. Said to Nadia, a preschool teacher with contamination OCD, it reinforces the compulsion, and the conversation alone can't tell you which one this is.

A context dimension is a kind of fact, such as current treatment, and a context value is one answer on it, such as [[kl-000600]]. The library has {{entries(context_dimension)}} dimensions and {{entries(context_value)}} values.

Context can change a pathway in seven ways. Only the first is in common use today.

:::cards numbered from=how-context-changes-a-pathway

- [[kl-000067]] applies only for [[kl-000741]].
- No entries yet.
- No entries yet.
- [[kl-000084]] leads to both [[kl-000030]] and [[kl-000038]].
- [[kl-000283]] is irreversible only under [[kl-000600]] and [[kl-000601]].
- No entries yet.
- [[kl-000700]] records it as susceptibility.
:::
:::

:::step 4

:::impact-domains
:::

:::chips OnsetMode
How it arrives
:::

:::chips Horizon
How soon
:::

:::

:::step 5

:::rating-ladder
:::

A few ratings sit outside that scale: an entry defined only by how it differs from other entries, an entry approved by the expert council, a documented company action such as a policy change, and a claim that is testable but that no study has measured yet.

Most of the library sits at the bottom of the scale. We publish the library in this state on purpose. A pathway is a hypothesis, and the catalog says how far each one has been tested.

When the library is used to test an AI system, a result says that a pattern occurred in a conversation. It does not say that the person was harmed, and it does not say how well supported the pathway is. [How an evaluation uses the Knowledge Library](/guide/evaluation).
:::
