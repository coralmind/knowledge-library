"""Controlled vocabularies shared by the entry models and the contract.

Each enum is the normative list for its field. A value appearing in the data
but not here is a defect in the data.
"""

from __future__ import annotations

from enum import StrEnum


class Described(StrEnum):
    """A string enum whose members carry a one-line definition.

    A member compares equal to its value and serializes as a plain string. The
    definition is that value's schema documentation.
    """

    description: str

    def __new__(cls, value: str, description: str = "") -> Described:
        obj = str.__new__(cls, value)
        obj._value_ = value
        obj.description = description
        return obj


class EntryType(Described):
    """The ``type`` field. ``context`` is carried only by retired entries."""

    ai_behavior = ("ai_behavior", "Conduct by the AI system.")
    user_behavior = ("user_behavior", "Conduct or state on the person's side of the transcript.")
    impact = ("impact", "An outcome for the person that pathways lead to.")
    pathway = (
        "pathway",
        "The hypothesis that named behaviors lead to a named impact.",
    )
    mechanism = ("mechanism", "The process by which one thing produces another.")
    context = (
        "context",
        "Retired: every entry of this type is deprecated. A contextual fact "
        "is now a `context_value` on a `context_dimension`.",
    )
    experience_cluster = (
        "experience_cluster",
        "A recognized trajectory composed of several pathways.",
    )
    operator_action = (
        "operator_action",
        "An act by the operator or deployer, evidenced outside the transcript.",
    )
    contrast = (
        "contrast",
        "A counterfactual relation over pathways: what should have happened "
        "instead, with its own evidence.",
    )
    divergence = (
        "divergence",
        "A relation over pathways that share their observations and differ in "
        "one context dimension: which value selects which pathway.",
    )
    context_dimension = (
        "context_dimension",
        "A dimension a test case is built along. Not gateable itself: a "
        "pathway names one of its values, never the dimension.",
    )
    context_value = (
        "context_value",
        "One value on a context dimension: what a condition-role part and a "
        "test case's assignment point at.",
    )


class Layer(Described):
    """What kind of thing an entry asserts."""

    observation = ("observation", "Something readable from the transcript itself.")
    judgment = (
        "judgment",
        "An evaluative claim about outcome or causation, not directly observable.",
    )
    process = ("process", "A mechanism operating over time.")
    context = (
        "context",
        "A fact about the person, or about the situation a test case places "
        "them in, that a pathway's claim may turn on.",
    )
    operator = ("operator", "An act by the operator or deployer.")


class LifecycleStatus(Described):
    draft = ("draft", "Authored and in the catalog; not yet ratified.")
    active = ("active", "Ratified and current.")
    deprecated = (
        "deprecated",
        "Retired. Exempt from the grounding requirements (`claims[]`, `standing`).",
    )


class DetectionWindow(Described):
    """The MINIMUM span sufficient to satisfy an entry's criteria.

    Not the maximum a detector may read.
    """

    single_turn = ("single_turn", "Readable from one turn alone.")
    turn_pair = (
        "turn_pair",
        "Readable from one person turn together with the AI turn that "
        "immediately answers it, or that it immediately answers, and from "
        "nothing earlier.",
    )
    multi_turn = (
        "multi_turn",
        "Requires material from more than two turns of one session.",
    )
    cross_session = ("cross_session", "Requires material from more than one session.")


class ClaimKind(Described):
    """What kind of assertion a claim makes."""

    existence = ("existence", "The behavior, state or pattern occurs at all.")
    definition = ("definition", "These criteria identify it.")
    definition_boundary = (
        "definition_boundary",
        "What separates this from a named neighbour. Grounding-ineligible when "
        "the neighbour is another catalog entry, since no external source "
        "addresses a distinction internal to the catalog.",
    )
    prevalence = ("prevalence", "It occurs at some rate, in some population.")
    harm = ("harm", "It leads somewhere bad, or bears on something that does.")
    detectability = ("detectability", "It can be identified from what a transcript contains.")
    context_dependence = ("context_dependence", "It holds in some conditions and not others.")
    pathway_link = (
        "pathway_link",
        "For pathway entries only, one claim per link. A pathway asserting that "
        "A leads to B via C is three claims, not one.",
    )
    detection_window = (
        "detection_window",
        "Whether the behavior is readable within the declared window. A claim "
        "ONLY where the entry declares one.",
    )


class Fit(Described):
    """Domain distance between source and claim.

    Independent of ``contributes``, which is the role the quote plays; the two
    axes must not be forced to agree. A citation that licenses nothing is
    removed or its claim narrowed, so there is no value for that state.
    """

    direct = (
        "direct",
        "Same population, same construct, and the design licenses this claim type.",
    )
    adjacent = ("adjacent", "Related population or construct. Requires a written bridge.")
    analogical = (
        "analogical",
        "Different domain, typically human-to-human clinical work standing in "
        "for an AI claim. Never evidence of occurrence in AI. Requires a bridge.",
    )


class Contributes(Described):
    """The evidence role a citation plays.

    Four values are not support. Non-licensing means cannot license an
    OCCURRENCE claim, not licenses nothing: ``frame`` still reaches ``theorized``
    and ``practice_analog`` reaches ``extrapolated_from_clinical``.
    """

    existence = ("existence", "The source shows the thing occurs.")
    definition = ("definition", "The source supplies the authoritative definition or criteria.")
    prevalence = ("prevalence", "The source reports how often it occurs, in a stated population.")
    harm_evidence = (
        "harm_evidence",
        "The source establishes the outcome as harmful or beneficial.",
    )
    detectability = (
        "detectability",
        "The source shows the thing can be identified from available signal.",
    )
    context_dependence = (
        "context_dependence",
        "The source shows the outcome turns on a fact about the test case, such as "
        "a presentation. Allowed only on a pathway that gates on a context value.",
    )
    counterexample = (
        "counterexample",
        "The source cuts against the claim. Real evidence bearing on it, so it "
        "counts as support; must set contradicts: true.",
    )
    frame = (
        "frame",
        "Establishes the conceptual frame, not that the thing occurred. Licenses "
        "`theorized` and no more.",
    )
    practice_analog = (
        "practice_analog",
        "External and on-topic but the wrong agent: what a clinician does, not "
        "what an AI did. Licenses `extrapolated_from_clinical` and no more.",
    )
    trail = (
        "trail",
        "Internal provenance: the catalog's own prior work. Never evidence.",
    )
    adjudication = (
        "adjudication",
        "A qualified body vetted the definition. Records governance, not occurrence.",
    )


class Standing(Described):
    """Evidential standing.

    The first six form an ordered evidence scale. The last four sit outside it:
    every rung of the scale names a way of observing a person, and these do not.
    """

    plausible_unobserved = (
        "plausible_unobserved",
        "The type floor. Nothing licenses more; the claim was looked for and not found.",
    )
    theorized = (
        "theorized",
        "A source states the claim as a position or framework, without measuring it.",
    )
    extrapolated_from_clinical = (
        "extrapolated_from_clinical",
        "The best citation is a clinical standard or practice account rather "
        "than a study of AI conduct.",
    )
    externally_classified = ("externally_classified", "A rater or instrument assigned the label.")
    observed_self_report = (
        "observed_self_report",
        "A source reports what people said about their own experience.",
    )
    observed_in_transcripts = (
        "observed_in_transcripts",
        "At least one direct-fit citation contributing existence, prevalence or "
        "detectability, from a source that examined conversation data. A paper "
        "reviewing others' transcript findings does not license it.",
    )

    asserted = (
        "asserted",
        "Off-scale. What an entry computes to when every claim is "
        "grounding-ineligible, i.e. every claim is a definition_boundary "
        "against another catalog entry. A single eligible claim disqualifies "
        "it and the entry takes an ordinary rung instead.",
    )
    ratified = ("ratified", "Off-scale. A governance act, not evidence of occurrence.")
    documented_operator_act = (
        "documented_operator_act",
        "Off-scale. The act is documented in a changelog, ToS diff, version "
        "string or dated announcement rather than observed in a person.",
    )
    unmeasured_by_design = (
        "unmeasured_by_design",
        "Off-scale. Precisely stated and falsifiable, but no instrument in the "
        "corpus scores it: no rubric asks a rater to make the comparison the "
        "claim requires.",
    )


class CompositionType(Described):
    """How a pathway's OBSERVATIONS compose.

    One field per semantic: the impact structure derives from ``impacts[]``,
    and conditionality is carried by the parts whose role is condition-like.

    Scopes to ``observations()``, not to every part: a condition-role part is
    not part of the composition this names.

    ``cascade`` is the exception: it describes an ordering between impact edges,
    because no other field holds the order of one impact after another.

    Each value's description makes a claim about how many observations the
    pathway has. Read it as what the value asserts, not as a rule enforced
    here.
    """

    direct = ("direct", "One part acts and the impact follows.")
    omission = ("omission", "The harm is in what the response fails to do.")
    conjunctive = (
        "conjunctive",
        "Several parts must co-occur. Neither element alone produces the outcome.",
    )
    trajectory = (
        "trajectory",
        "Parts alternate across turns, each conditioning the next. Sequential "
        "rather than co-occurrent.",
    )
    reciprocal_loop = ("reciprocal_loop", "Each part raises the likelihood of the other.")
    mediated = (
        "mediated",
        "The parts sit on opposite sides of a mediating quantity: one raises it, "
        "and the outcome follows from the quantity rather than from the part "
        "directly. The quantity itself is named in `mediators`, unquantified.",
    )
    cascade = ("cascade", "One impact becomes the condition for the next.")


class PartRole(Described):
    """What a part does in the pathway, and which view it falls into.

    ``role`` decides both derived views. A part whose role is ``condition`` is
    returned by ``preconditions()``, the identity gate, where changing a member
    makes it a different pathway. Every other value is returned by
    ``observations()``: what happened, and what ``composition_type`` describes.

    A wrong role yields a wrong derived gate, so the role is the first thing
    to check when a pathway's gate looks wrong.

    A role belongs to the part, not to the behavior it names: the same
    behavior legitimately originates one pathway and sustains another, and
    normalizing a behavior to one role would change what those pathways
    assert.
    """

    originator = ("originator", "Starts the pathway.")
    initiator = ("initiator", "Opens the exchange the pathway runs through.")
    sustainer = ("sustainer", "Keeps the pattern going once started.")
    amplifier = ("amplifier", "Intensifies an already-running pattern.")
    elicitor = ("elicitor", "Draws the other part's contribution out.")
    non_interruptor = (
        "non_interruptor",
        "Fails to break the pattern when it could have. An act, not a "
        "condition: what is named is a response that happened and was "
        "deficient, so it composes rather than gates.",
    )
    condition = (
        "condition",
        "Must hold for the pathway to run, without acting. The only "
        "condition-like value: these are what `preconditions()` returns.",
    )

    @property
    def is_condition_like(self) -> bool:
        """Whether a part in this role gates the claim rather than composing it."""
        return self is PartRole.condition


class Sign(Described):
    harmful = ("harmful", "The edge runs toward harm.")
    protective = ("protective", "The edge runs away from harm.")
    mixed = ("mixed", "Both directions are asserted, depending on conditions.")


class PartKind(Described):
    """What kind of entry a ``composition_parts`` item names. Selects the part's class."""

    ai_behavior = ("ai_behavior", "The part names conduct by the AI.")
    user_behavior = ("user_behavior", "The part names conduct or state on the person's side.")
    context_value = (
        "context_value",
        "The part names a context value. Always a condition: a fact the test "
        "case holds, never something that happened.",
    )


class OnsetMode(Described):
    new = ("new", "The impact did not exist before.")
    exacerbated = ("exacerbated", "An existing impact is worsened.")
    foregone = ("foregone", "A benefit that would otherwise have occurred does not.")
    sustained = ("sustained", "An existing impact is held in place.")


class Horizon(Described):
    """How soon the impact follows the behavior."""

    immediate = ("immediate", "Within the conversation.")
    short_term = ("short_term", "Days to weeks.")
    long_term = ("long_term", "Months or longer.")


class LevelOfAnalysis(Described):
    """Whose outcome the edge is about.

    A population-level finding does not license a within-person claim.
    """

    individual = ("individual", "This person's outcome.")
    population = ("population", "A rate across a group.")


class SourceKind(Described):
    """What kind of record a source row is."""

    empirical_study = ("empirical_study", "A study reporting its own data.")
    benchmark = ("benchmark", "A dataset or evaluation suite.")
    review = ("review", "A synthesis of other work.")
    position = ("position", "An argued stance rather than a finding.")
    instrument = ("instrument", "A measure or scale.")
    clinical_instrument = (
        "clinical_instrument",
        "A measure validated for clinical use.",
    )
    guidance = ("guidance", "Practice guidance from a body.")
    policy = ("policy", "A regulation or policy document.")
    paper = ("paper", "A work whose kind was not further classified.")
    internal_artifact = (
        "internal_artifact",
        "One of the project's own documents. Never external evidence.",
    )
    deliberation_record = (
        "deliberation_record",
        "A record of a decision this project made.",
    )


class StudyLevel(Described):
    """The unit a source's findings are measured over.

    Distinct from ``LevelOfAnalysis``, which says whose outcome a claim is about.
    This says how the source's data was collected.
    """

    within_person = ("within_person", "Repeated measures on the same person.")
    between_person = ("between_person", "Comparison across different people.")
    population = ("population", "Aggregate rates over a group.")
    dyad = ("dyad", "The person-and-system pair as the unit.")
    model_output = ("model_output", "Model responses, with no human participants.")


class LicenseStatus(Described):
    """Whether the cited version of a source may be reused, and on what terms."""

    known_permissive = (
        "known_permissive",
        "The cited version carries an open license, such as CC0 or a CC BY "
        "variant, or is in the public domain.",
    )
    known_restrictive = (
        "known_restrictive",
        "The cited version carries publisher or author copyright, or a "
        "distribution-only license, with no open license.",
    )
    unknown = (
        "unknown",
        "Not established, including when the work's own statements conflict. "
        "Treated as restrictive.",
    )


class PeerReviewed(Described):
    """The review status of the venue a source appeared in."""

    journal = ("journal", "A peer-reviewed journal.")
    conference_proceedings = (
        "conference_proceedings",
        "A peer-reviewed conference track.",
    )
    preprint = ("preprint", "Posted without peer review.")
    report = ("report", "An institutional or technical report.")
    guidance = ("guidance", "Issued by a body rather than reviewed.")
    unknown = ("unknown", "Not established. Not a claim that it was unreviewed.")


class ReplicationStatus(Described):
    """Whether a source replicates other work, or has been replicated."""

    none_known = ("none_known", "Neither replicates nor is known to be replicated.")
    is_replication = ("is_replication", "This work replicates an earlier finding.")
    replicated = ("replicated", "This work's finding has been replicated elsewhere.")


class StudyPopulation(Described):
    """Who a source studied."""

    model_only = ("model_only", "No human participants.")
    general_adult = ("general_adult", "Adults not selected for a condition.")
    adolescent = ("adolescent", "Participants under 18.")
    clinician = ("clinician", "Practitioners rather than the people they treat.")
    clinical_sample = ("clinical_sample", "Participants selected for a diagnosis.")
    help_seeking = ("help_seeking", "People who sought support, clinical or not.")
    companion_app_user = ("companion_app_user", "Users of a companion product.")
    crisis_service_user = ("crisis_service_user", "People who contacted a crisis line.")


class PassageConduct(Described):
    """Whose conduct a cited passage shows."""

    ai = ("ai", "The AI system's.")
    person = ("person", "The person's.")
    dyad = ("dyad", "The exchange between the person and the AI system.")
    neither = ("neither", "No one's: the passage states a definition, a rate, or a framework.")


class CitationDisposition(Described):
    """What a search of a source found for the entry, where it found no support."""

    searched_no_support = (
        "searched_no_support",
        "The source was read for this entry and supports nothing it asserts.",
    )
    contradicted = ("contradicted", "The source was read for this entry and cuts against it.")


class StudiedAgent(Described):
    """Whose conduct a source observed."""

    ai = ("ai", "The AI system's responses.")
    person = ("person", "The people using it.")
    both = ("both", "The AI system's responses and the people using it.")


class BasisKind(Described):
    """What kind of authoring basis backs a pathway's causal edge."""

    SPEC_CLAIM = ("SPEC_CLAIM", "Derived from the project's own specification work.")
    TRANSFER = (
        "TRANSFER",
        "Carried over from clinical or pre-AI results applied to the AI context.",
    )
    ASSERTED = ("ASSERTED", "Stated by the authoring pass with no external support.")
    SOURCED = ("SOURCED", "Backed by a cited source.")
    SOURCED_QUOTE = ("SOURCED_QUOTE", "Backed by a verbatim quote from a source.")
    FRAME = (
        "FRAME",
        "Rests on a conceptual framing rather than a finding about occurrence.",
    )
    VOCAB = ("VOCAB", "Follows from the vocabulary's own definitions, not from evidence.")


class Valence(Described):
    """Whether the entry names something bad, good, or hazard-bearing."""

    negative = ("negative", "A harm.")
    positive = ("positive", "A benefit.")
    risk = (
        "risk",
        "A hazard rather than a realized outcome. Used by operator actions.",
    )


class ImpactKind(Described):
    """What shape the outcome takes."""

    state = ("state", "A condition the person is in.")
    pattern = ("pattern", "A recurring behavior or cycle.")
    counterfactual = (
        "counterfactual",
        "A benefit that would otherwise have occurred and did not.",
    )


class ImpactDomain(Described):
    """The area of life or functioning the impact falls in."""

    symptom_course = ("symptom_course", "The course of a clinical condition.")
    cognitive_epistemic = ("cognitive_epistemic", "Reasoning, belief formation, reality-testing.")
    self_regard_agency_hope = (
        "self_regard_agency_hope",
        "How the person sees and values themselves.",
    )
    relational_social = ("relational_social", "Relationships and social connection.")
    interactional_experience = ("interactional_experience", "What the exchange itself felt like.")
    relationship_to_help = (
        "relationship_to_help",
        "Willingness to seek or accept care, including from people.",
    )


class DetectableFrom(Described):
    """What kind of transcript material a user behavior is readable from."""

    person_turns = ("person_turns", "Readable from what the person did in the conversation.")
    person_report = (
        "person_report",
        "Known only because the person said so. A judge scoring conduct must "
        "not treat it as observed.",
    )


class PersonStateKind(Described):
    """What kind of thing a user-behavior entry picks out."""

    process = ("process", "Something unfolding over turns.")
    behavior_pattern = ("behavior_pattern", "A recurring way of acting.")
    state = ("state", "A condition the person is in at a point in time.")


class ContextKind(Described):
    """What kind of contextual fact a retired context entry recorded.

    Carried only by deprecated entries. On a live entry a value's kind is its
    dimension, and a dimension's group is its ``about``.
    """

    condition = ("condition", "A clinical presentation.")
    population = ("population", "A demographic or group membership.")
    deployment = ("deployment", "What the system is deployed as.")
    system_knowledge = ("system_knowledge", "What the model already knows about this person.")
    withheld_fact = ("withheld_fact", "Something true of the person that they do not disclose.")
    persona_schema = ("persona_schema", "A specification for constructing a simulated person.")
    precipitating_situation = (
        "precipitating_situation",
        "What has just happened to the person, and what they are seeking "
        "because of it. A property of the case rather than of the person.",
    )
    session_position = (
        "session_position",
        "Where this conversation sits in a sequence of contacts with the same "
        "person. Distinct from what the deployment was told about them.",
    )
    presentation_stance = (
        "presentation_stance",
        "How the person puts their situation to the system, as distinct from "
        "what their situation is. Varies independently of the person.",
    )
    conversational_intent = (
        "conversational_intent",
        "What the person is trying to get from the conversation, as distinct "
        "from what is wrong with them. Crossed with the person, not contained "
        "in them.",
    )
    user_belief_about_ai = (
        "user_belief_about_ai",
        "What the person takes the system to be: how objective, expert or "
        "authoritative. A property of their model of the system, not of it.",
    )


class CategoryScope(Described):
    """How tightly a context value maps to a recognized clinical category."""

    mental_health_condition = ("mental_health_condition", "Maps to a named diagnostic category.")
    mental_health_state_pattern = (
        "mental_health_state_pattern",
        "A recognizable pattern with no formal diagnostic category.",
    )
    residual = ("residual", "A catch-all for cases the named categories miss.")


class ContextAbout(Described):
    """What the facts on a context dimension are about.

    Decides where a value is recorded: a ``person`` value on the persona, every
    other value on the test case.
    """

    person = (
        "person",
        "Who the person is: facts that persist beyond this conversation.",
    )
    occasion = (
        "occasion",
        "What has just happened to the person that brings them to this conversation.",
    )
    exchange = (
        "exchange",
        "Properties of this conversation rather than of either party.",
    )
    setting = (
        "setting",
        "What the system is deployed as; the same for every person using it.",
    )


class ValueSpace(Described):
    """How a context dimension's values are given, and so how a gate on it is read."""

    enumerated = (
        "enumerated",
        "The values are listed as entries. A gate holds on equality or membership.",
    )
    ordered = (
        "ordered",
        "The values are listed as entries and ordered by `ordinal`. A gate "
        "naming a value holds at that value or past it.",
    )
    described = (
        "described",
        "The values are authored as they are needed and must satisfy the "
        "dimension's `admits`. A gate holds on equality or membership.",
    )


class Cardinality(Described):
    """How many values a test case may record on one context dimension."""

    one = ("one", "A test case records at most one value on this dimension.")
    many = ("many", "A test case may record several values on this dimension.")


class SourceQuality(Described):
    """One grade per paper, assigned once on its source entry and reused everywhere.

    A property of the paper, not of its bearing on any claim: an A-grade paper
    at analogical fit is weak support. Read alongside ``fit``, never instead of it.
    """

    A = (
        "A",
        "Pre-registered or replicated, adequately powered, peer-reviewed, "
        "design appropriate to its own claims. Licenses causal claims.",
    )
    B = (
        "B",
        "Peer-reviewed, sound design, ordinary limitations. Licenses directional claims.",
    )
    C = (
        "C",
        "Weak design for its claims, small or convenience sample, or an "
        "unreviewed preprint. Licenses existence claims only.",
    )
    D = (
        "D",
        "Serious problems: no methods, unreported N, undisclosed conflicts, or "
        "a failed replication. Cannot lift a claim above `theorized`.",
    )
    not_applicable = (
        "n/a",
        "Not an empirical claim-maker: theoretical work, clinical guidance, or "
        "instrument documentation. Graded on authority instead.",
    )


class EdgeKind(Described):
    """The relations ``models.edges()`` projects out of an entry.

    Not an authored vocabulary. Entries declare relationships in typed,
    per-slot fields, and these are the names those fields take in the
    flattened graph.
    """

    composition_parts = (
        "composition_parts",
        "Pathway to a part it is composed of or gated by: a behavior, or a "
        "context value under `role: condition`.",
    )
    impacts = ("impacts", "Pathway to the impact it leads to.")
    mechanisms = ("mechanisms", "Pathway to a mechanism asserted to drive it.")
    downstream = ("downstream", "Pathway to a further impact its own impact feeds.")
    cluster_candidate = (
        "cluster_candidate",
        "Pathway to an experience cluster it is a candidate member of.",
    )
    condition_tags = (
        "condition_tags",
        "User behavior to a context value it commonly co-occurs with.",
    )
    irreversibility_conditions = (
        "irreversibility_conditions",
        "AI behavior to a context value its irreversibility is scoped to.",
    )
    reference_behavior = (
        "reference_behavior",
        "AI behavior to the counterpart it is defined partly by contrast to.",
    )
    covers = (
        "covers",
        "Context value to a value on the same dimension it stands for, where it names a union.",
    )
    composed_of = ("composed_of", "Composite entry to one of its constituents.")
    instances = ("instances", "Mechanism to a behavior it runs through.")
    experience_clusters = (
        "experience_clusters",
        "Context value to an experience cluster it wires to.",
    )
    dimension = (
        "dimension",
        "Context value to the dimension it sits on, or divergence to the dimension "
        "that selects its members.",
    )
    members = ("members", "Contrast or divergence to a member pathway.")
    discriminator = (
        "discriminator",
        "Contrast to a part that tells its members' responses apart.",
    )
    selecting_value = (
        "selecting_value",
        "Divergence to the context value that selects one of its members.",
    )
    relative_impact = (
        "relative_impact",
        "Divergence to an impact one member leads to more strongly than the others.",
    )
    superseded_by = (
        "superseded_by",
        "Deprecated entry to an entry of the same type that replaces it.",
    )
    distinguish_from = (
        "distinguish_from",
        "Entry to the neighbour a boundary statement separates it from.",
    )
    citation = ("citation", "Entry to a paper cited by its claim evidence.")
