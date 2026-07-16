// Qualifiers in the order they should appear in the label.
// This matches the UI order of the checkboxes left-to-right.
const QUALIFIER_ORDER = ['Step', 'Half', 'In-Law', 'Former', 'Late'];

// Relationships that never take an "in-law" treatment in the old model.
// Kept for the legacy wrapper below.
const NO_INLAW = new Set(['Spouse / Partner', 'Spouse/Partner', 'Friend', 'Other', 'Self', 'Partner', 'Husband', 'Wife']);

// Build the "Great-Great-Great-" prefix from a count.
// greatCount = 0 → "", 1 → "Great-", 2 → "Great-Great-", etc.
// Applies to any relationship — the keeper decides what's meaningful.
function buildGreatPrefix(greatCount) {
  if (!greatCount || greatCount < 1) return '';
  return 'Great-'.repeat(greatCount);
}

// Build the qualifier prefix in the locked-in order: Step, Half, In-Law, Former, Late.
// Each matching qualifier contributes its word followed by a hyphen-space separator
// that the caller decides how to join.
function buildQualifierParts(qualifiers) {
  if (!qualifiers || qualifiers.length === 0) return [];
  const set = new Set(qualifiers);
  return QUALIFIER_ORDER.filter(q => set.has(q));
}

// Compose the full relationship label for a single person.
// Returns { primary, secondary } — secondary is reserved for future two-line rendering
// (e.g., partner-family grouping). For now, most callers only need primary.
//
// Arguments:
//   person     — the person object from fetchPeople
//   people     — the full list of people for this keeper (needed for related_via lookup)
//   keeperName — the keeper's first name, for seeker-side rendering (optional)
//
// The seeker-side rendering (e.g., "Alice's Mother") is handled elsewhere;
// this function handles the keeper's own view.
export function composeLabels(person, people = [], keeperName = null) {
  if (!person || !person.relationship) {
    return { primary: '', secondary: null };
  }

  const { relationship, side, qualifiers = [], greatCount = 0, relatedVia = null } = person;

  // The keeper's own card shows no label (v22 decision #5).
  if (relationship === 'Self') {
    return { primary: '', secondary: null };
  }

  // Build the core label: [Great-...][Step-/Half-/In-Law-/Former-/Late- ...]Relationship
  const greatPrefix = buildGreatPrefix(greatCount);
  const qualifierParts = buildQualifierParts(qualifiers);

  // Late and Former render with a space before the relationship ("Late Husband"),
  // while Step, Half, and In-Law render with a hyphen ("Step-Sister", "Sister-in-Law").
  // In-Law is special: it attaches as a suffix after the base word, not as a prefix.
  let core = relationship;

  // Suffix qualifiers (applied to base word): In-Law goes last
  const hasInLaw = qualifierParts.includes('In-Law');
  const prefixQualifiers = qualifierParts.filter(q => q !== 'In-Law');

  // Prefix qualifiers attach with hyphen for Step/Half, space for Former/Late
  const prefixPieces = [];
  if (greatPrefix) prefixPieces.push(greatPrefix.replace(/-$/, '')); // strip trailing hyphen, we'll add it back
  for (const q of prefixQualifiers) {
    prefixPieces.push(q);
  }

  if (prefixPieces.length > 0) {
    // Join Step/Half/Great with hyphens, then attach Former/Late with a space before the relationship
    // Split into hyphen-joined group (Great, Step, Half) and space-separated group (Former, Late)
    const hyphenGroup = [];
    const spaceGroup = [];
    for (const piece of prefixPieces) {
      if (piece === 'Former' || piece === 'Late') {
        spaceGroup.push(piece);
      } else {
        hyphenGroup.push(piece);
      }
    }

    let assembled = '';
    if (hyphenGroup.length > 0) {
      assembled = hyphenGroup.join('-') + '-' + relationship;
    } else {
      assembled = relationship;
    }
    if (spaceGroup.length > 0) {
      assembled = spaceGroup.join(' ') + ' ' + assembled;
    }
    core = assembled;
  }

  if (hasInLaw) {
    core = core + '-in-Law';
  }

  // Partner-side anchoring: if related_via is set, prepend "{PartnerFirstName}'s "
  if (relatedVia) {
    const partner = people.find(p => p.id === relatedVia);
    if (partner) {
      const partnerFirst = partner.name?.split(' ')[0];
      if (partnerFirst) {
        return { primary: `${partnerFirst}'s ${core}`, secondary: null };
      }
    }
  }

  return { primary: core, secondary: null };
}

// ---- Legacy wrapper (keeps existing components working during rollout) ----
//
// Origins.jsx, SeekerGallery.jsx, and other views currently call getDisplayRelationship
// with (relationship, side, partnerName). We preserve that signature exactly.
// Session C will migrate these callers to composeLabels directly.
export const getDisplayRelationship = (relationship, side, partnerName) => {
  if (!relationship) return '';
  if (side === 'Partner Family' && !NO_INLAW.has(relationship)) {
    if (partnerName) return `${partnerName}'s ${relationship}`;
    return `${relationship}-in-law`;
  }
  return relationship;
};