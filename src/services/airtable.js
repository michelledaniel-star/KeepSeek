import { supabase } from './supabase';

// Simple module-level cache — 60 second TTL
const cache = {};
const CACHE_TTL = 60 * 1000;

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

export function invalidateCache(key) {
  if (key) delete cache[key];
  else Object.keys(cache).forEach(k => delete cache[k]);
}

// Fetch all items for a keeper
export async function fetchItems(keeperId) {
  console.log('fetchItems called with keeperId:', keeperId);
  if (!keeperId) return [];
  const cacheKey = `items-${keeperId}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('fetchItems cache hit for', cacheKey, 'length:', cached.length);
    return cached;
  }
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('keeper_id', keeperId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Fetch primary images for all items in one query
    const itemIds = data.map(r => r.id);
    let imageMap = {};
    let imagesMap = {};
    if (itemIds.length > 0) {
      const { data: images } = await supabase
        .from('images')
        .select('item_id, url, order')
        .in('item_id', itemIds)
        .order('order', { ascending: true });
      if (images) {
        images.forEach(img => {
          if (!imagesMap[img.item_id]) imagesMap[img.item_id] = [];
          imagesMap[img.item_id].push(img.url);
          if (img.order === 0) imageMap[img.item_id] = img.url;
        });
      }
    }

    const result = data.map(record => ({
      id: record.id,
      name: record.name || '',
      image: imageMap[record.id] || record.image_url || '',
      images: imagesMap[record.id] || [],
      year: record.year || '',
      description: record.description || '',
      ownerId: record.person_id || '',
      status: record.status || 'draft',
      entryComplete: record.entry_complete || false,
      value: record.value || '',
      notes: record.notes || '',
      beneficiary: record.beneficiary || '',
      category: record.category || '',
      createdAt: record.created_at || '',
    }));
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
}

// Fetch all people for a keeper
export async function fetchPeople(keeperId) {
  if (!keeperId) return [];
  const cacheKey = `people-${keeperId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  try {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('keeper_id', keeperId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Fetch primary photos for all people in one query
    const personIds = data.map(r => r.id);
    let photoMap = {};
    let photosMap = {};
    if (personIds.length > 0) {
      const { data: photos } = await supabase
        .from('images')
        .select('person_id, url, order')
        .in('person_id', personIds)
        .order('order', { ascending: true });
      if (photos) {
        photos.forEach(img => {
          if (!photosMap[img.person_id]) photosMap[img.person_id] = [];
          photosMap[img.person_id].push(img.url);
          if (img.order === 0) photoMap[img.person_id] = img.url;
        });
      }
    }

    const result = data.map(record => ({
      id: record.id,
      name: record.name || '',
      photo: photoMap[record.id] || record.photo || '',
      photos: photosMap[record.id] || [],
      relationship: record.relationship || '',
      side: record.side || '',
      generation: record.generation ?? 0,
      years: record.years || '',
      location: record.location || '',
      birthdate: record.birthdate || '',
      notes: record.notes || '',
      middleName: record.middle_name || '',
      maidenName: record.maiden_name || '',
      entryComplete: record.entry_complete || false,
      noPhoto: record.no_photo || false,
      profileVisited: record.profile_visited || false,
      relatedVia: record.related_via || null,
      qualifiers: record.qualifiers || [],
      greatCount: record.great_count ?? 0,
    }));
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching people:', error);
    return [];
  }
}

// Fetch stories for an item
export async function fetchStoryForItem(itemId) {
  if (!itemId) return null;
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    // Return first story — multiple stories per item is supported but
    // components currently expect a single story object. Phase 6 will
    // update components to handle multiple stories.
    const record = data[0];
    return {
      id: record.id,
      storyType: record.story_type || 'text',
      textContent: record.text_content || '',
      mediaUrl: record.media_url || '',
    };
  } catch (error) {
    console.error('Error fetching story:', error);
    return null;
  }
}

// Create a new item
export async function createItem(itemData, keeperId) {
  if (!keeperId) throw new Error('keeperId is required to create an item');
  try {
    const { data, error } = await supabase
      .from('items')
      .insert({
        keeper_id: keeperId,
        person_id: itemData.ownerId || null,
        name: itemData.name,
        description: itemData.description || '',
        status: itemData.status || 'draft',
        year: itemData.year || '',
        category: itemData.category || '',
        value: itemData.value || '',
        beneficiary: itemData.beneficiary || '',
        notes: itemData.notes || '',
      })
      .select()
      .single();
    if (error) throw error;

    // Insert primary image if provided
    if (itemData.imageUrl) {
      await supabase
        .from('images')
        .insert({
          item_id: data.id,
          url: itemData.imageUrl,
          order: 0,
        });
    }

    invalidateCache(`items-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
}

// Create a new story
export async function createStory(storyData) {
  try {
    const { data, error } = await supabase
      .from('stories')
      .insert({
        item_id: storyData.itemId || null,
        story_type: storyData.storyType,
        text_content: storyData.textContent || '',
        media_url: storyData.mediaUrl || '',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating story:', error);
    throw error;
  }
}

// Update an existing story
export async function updateStory(recordId, storyData) {
  try {
    const { data, error } = await supabase
      .from('stories')
      .update({
        story_type: storyData.storyType,
        text_content: storyData.textContent || '',
        media_url: storyData.mediaUrl || '',
      })
      .eq('id', recordId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating story:', error);
    throw error;
  }
}

// Create a new person
export async function createPerson(personData, keeperId) {
  if (!keeperId) throw new Error('keeperId is required to create a person');
  try {
    const { data, error } = await supabase
      .from('people')
      .insert({
        keeper_id: keeperId,
        name: personData.name,
        relationship: personData.relationship || '',
        side: personData.side || '',
        generation: personData.generation ?? 0,
        years: personData.years || '',
        location: personData.location || '',
        birthdate: personData.birthdate || '',
        notes: personData.notes || '',
        related_via: personData.relatedVia || null,
        qualifiers: personData.qualifiers || [],
        great_count: personData.greatCount ?? 0,
      })
      .select()
      .single();
    if (error) throw error;

    // Insert primary photo if provided
    if (personData.photoUrl) {
      await supabase
        .from('images')
        .insert({
          person_id: data.id,
          url: personData.photoUrl,
          order: 0,
        });
    }

    invalidateCache(`people-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error creating person:', error);
    throw error;
  }
}

// Update a person
export async function updatePerson(recordId, personData, keeperId) {
  try {
    const firstName = personData.firstName || '';
    const lastName = personData.lastName || '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || personData.name || '';

    const updateFields = {
      name: displayName,
      middle_name: personData.middleName || '',
      maiden_name: personData.maidenName || '',
      relationship: personData.relationship || '',
      side: personData.side || '',
      generation: personData.generation ?? 0,
      years: personData.years || '',
      location: personData.location || '',
      birthdate: personData.birthdate || '',
      notes: personData.notes || '',
      entry_complete: personData.entryComplete ?? false,
      ...(personData.noPhoto !== undefined && { no_photo: personData.noPhoto }),
      ...(personData.profileVisited !== undefined && { profile_visited: personData.profileVisited }),
      ...(personData.relatedVia !== undefined && { related_via: personData.relatedVia }),
      ...(personData.qualifiers !== undefined && { qualifiers: personData.qualifiers }),
      ...(personData.greatCount !== undefined && { great_count: personData.greatCount }),
    };

    const { data, error } = await supabase
      .from('people')
      .update(updateFields)
      .eq('id', recordId)
      .select()
      .single();
    if (error) throw error;

    // Handle photo update if provided
    const photoUrl = personData.photoUrl || personData.photo || null;
    if (photoUrl && !photoUrl.startsWith('blob:')) {
      const { data: existingPhotos } = await supabase
        .from('images')
        .select('id, order')
        .eq('person_id', recordId)
        .order('order', { ascending: true })
        .limit(1);
      const existingPhoto = existingPhotos && existingPhotos.length > 0 && existingPhotos[0].order === 0
        ? existingPhotos[0]
        : null;

      if (existingPhoto) {
        await supabase
          .from('images')
          .update({ url: photoUrl })
          .eq('id', existingPhoto.id);
      } else {
        await supabase
          .from('images')
          .insert({ person_id: recordId, url: photoUrl, order: 0 });
      }
    }

    // If this is the keeper's Self person, sync name to keepers table
    if (personData.relationship === 'Self' && keeperId) {
      await supabase
        .from('keepers')
        .update({ name: displayName })
        .eq('id', keeperId);
    }

    if (keeperId) invalidateCache(`people-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error updating person:', error);
    throw error;
  }
}

// Update an item
export async function updateItem(recordId, itemData, keeperId) {
  try {
    const fields = {};
    if (itemData.Name !== undefined) fields.name = itemData.Name;
    if (itemData.name !== undefined) fields.name = itemData.name;
    if (itemData.Description !== undefined) fields.description = itemData.Description;
    if (itemData.description !== undefined) fields.description = itemData.description;
    if (itemData.Status !== undefined) fields.status = itemData.Status;
    if (itemData.status !== undefined) fields.status = itemData.status;
    if (itemData.Year !== undefined) fields.year = itemData.Year;
    if (itemData.year !== undefined) fields.year = itemData.year;
    if (itemData.ImageUrl !== undefined) fields.image_url = itemData.ImageUrl;
    if (itemData.image_url !== undefined) fields.image_url = itemData.image_url;
    if (itemData.Category !== undefined) fields.category = itemData.Category;
    if (itemData.category !== undefined) fields.category = itemData.category;
    if (itemData.Value !== undefined) fields.value = itemData.Value;
    if (itemData.value !== undefined) fields.value = itemData.value;
    if (itemData.Beneficiary !== undefined) fields.beneficiary = itemData.Beneficiary;
    if (itemData.beneficiary !== undefined) fields.beneficiary = itemData.beneficiary;
    if (itemData['Extra Notes'] !== undefined) fields.notes = itemData['Extra Notes'];
    if (itemData.notes !== undefined) fields.notes = itemData.notes;
    if (itemData.Owner !== undefined) fields.person_id = Array.isArray(itemData.Owner) ? itemData.Owner[0] : itemData.Owner;
    if (itemData.person_id !== undefined) fields.person_id = itemData.person_id;
    if (itemData.entry_complete !== undefined) fields.entry_complete = itemData.entry_complete;

    const { data, error } = await supabase
      .from('items')
      .update(fields)
      .eq('id', recordId)
      .select()
      .single();
    if (error) throw error;
    if (keeperId) invalidateCache(`items-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
}

// Delete an item
export async function deleteItem(recordId, keeperId) {
  try {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', recordId);
    if (error) throw error;
    if (keeperId) invalidateCache(`items-${keeperId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

// Delete item and auto-delete person if it was their last item
export async function deleteItemAndOrphanCheck(itemId, keeperId) {
  try {
    const { data: itemRow } = await supabase
      .from('items')
      .select('person_id')
      .eq('id', itemId)
      .single();

    const personId = itemRow?.person_id;

    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;

    if (personId) {
      const { data: remaining } = await supabase
        .from('items')
        .select('id')
        .eq('person_id', personId)
        .limit(1);

      if (!remaining || remaining.length === 0) {
        const { data: person } = await supabase
          .from('people')
          .select('relationship')
          .eq('id', personId)
          .single();

        if (person && person.relationship !== 'Self') {
          await supabase.from('people').delete().eq('id', personId);
          if (keeperId) invalidateCache(`people-${keeperId}`);
        }
      }
    }

    if (keeperId) invalidateCache(`items-${keeperId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
}

// Fetch images for an item
export async function fetchItemImages(itemId) {
  if (!itemId) return [];
  try {
    const { data, error } = await supabase
      .from('images')
      .select('id, url, order, caption')
      .eq('item_id', itemId)
      .order('order', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching item images:', error);
    return [];
  }
}

// Add an image to an item
export async function addItemImage(itemId, url, keeperId) {
  try {
    const { data: existing } = await supabase
      .from('images')
      .select('order')
      .eq('item_id', itemId)
      .order('order', { ascending: false })
      .limit(1);
    const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 0;
    const { data, error } = await supabase
      .from('images')
      .insert({ item_id: itemId, url, order: nextOrder })
      .select()
      .single();
    if (error) throw error;
    if (keeperId) invalidateCache(`items-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error adding item image:', error);
    throw error;
  }
}

// Add a photo to a person
export async function addPersonPhoto(personId, url, keeperId) {
  try {
    const { data: existing } = await supabase
      .from('images')
      .select('order')
      .eq('person_id', personId)
      .order('order', { ascending: false })
      .limit(1);
    const nextOrder = existing && existing.length > 0 ? existing[0].order + 1 : 0;
    const { data, error } = await supabase
      .from('images')
      .insert({ person_id: personId, url, order: nextOrder })
      .select()
      .single();
    if (error) throw error;
    if (keeperId) invalidateCache(`people-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error adding person photo:', error);
    throw error;
  }
}

// Delete an image
export async function deleteImage(imageId, keeperId) {
  try {
    const { error } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId);
    if (error) throw error;
    if (keeperId) invalidateCache(`items-${keeperId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

// Replace primary image for an item (order=0)
export async function replaceItemPrimaryImage(itemId, url, keeperId) {
  try {
    const { data: existingRows } = await supabase
      .from('images')
      .select('id, order')
      .eq('item_id', itemId)
      .order('order', { ascending: true })
      .limit(1);
    const existing = existingRows && existingRows.length > 0 && existingRows[0].order === 0
      ? existingRows[0]
      : null;
    if (existing) {
      await supabase.from('images').update({ url }).eq('id', existing.id);
    } else {
      await supabase.from('images').insert({ item_id: itemId, url, order: 0 });
    }
    if (keeperId) invalidateCache(`items-${keeperId}`);
    return { success: true };
  } catch (error) {
    console.error('Error replacing primary image:', error);
    throw error;
  }
}

// Set an existing person photo as primary (order=0), demote current primary to order=1
export async function setPersonPrimaryPhoto(personId, imageId, keeperId) {
  try {
    // Get all photos for this person
    const { data: photos, error } = await supabase
      .from('images')
      .select('id, order')
      .eq('person_id', personId)
      .order('order', { ascending: true });
    if (error) throw error;

    // Demote current primary if it exists and isn't the one being set
    const currentPrimary = photos.find(p => p.order === 0 && p.id !== imageId);
    if (currentPrimary) {
      await supabase.from('images').update({ order: 1 }).eq('id', currentPrimary.id);
    }

    // Set the chosen photo as primary
    await supabase.from('images').update({ order: 0 }).eq('id', imageId);

    if (keeperId) invalidateCache(`people-${keeperId}`);
    return { success: true };
  } catch (error) {
    console.error('Error setting primary photo:', error);
    throw error;
  }
}

// Add a new photo for a person and make it the primary (order=0), demote existing primary
export async function addPersonPhotoAsPrimary(personId, url, keeperId) {
  try {
    // Demote current primary if exists
    const { data: existingRows } = await supabase
      .from('images')
      .select('id, order')
      .eq('person_id', personId)
      .order('order', { ascending: true })
      .limit(1);
    const existing = existingRows && existingRows.length > 0 && existingRows[0].order === 0
      ? existingRows[0]
      : null;

    if (existing) {
      await supabase.from('images').update({ order: 1 }).eq('id', existing.id);
    }

    // Insert new photo as primary
    const { data, error } = await supabase
      .from('images')
      .insert({ person_id: personId, url, order: 0 })
      .select()
      .single();
    if (error) throw error;

    if (keeperId) invalidateCache(`people-${keeperId}`);
    return data;
  } catch (error) {
    console.error('Error adding primary photo:', error);
    throw error;
  }
}

// Delete a person
export async function deletePerson(recordId, keeperId) {
  try {
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', recordId);
    if (error) throw error;
    if (keeperId) invalidateCache(`people-${keeperId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting person:', error);
    throw error;
  }
}