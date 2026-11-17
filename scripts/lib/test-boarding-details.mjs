import assert from 'node:assert/strict';

export async function testBoardingDetails({ client, url, get }) {
  void url;
  const publicId = '71000000-0000-4000-8000-000000000051';
  const areaId   = '71000000-0000-4000-8000-000000000052';
  const hiddenId = '71000000-0000-4000-8000-000000000053';
  const listing1 = '72000000-0000-4000-8000-000000000051';
  const listing2 = '72000000-0000-4000-8000-000000000052';
  const listing3 = '72000000-0000-4000-8000-000000000053';

  // Seed isolated test fixtures
  await client.query(`
    INSERT INTO public.places(id, kind, canonical_name, normalized_name, data_kind, source_label, status)
    VALUES
      ($1, 'BOARDING', 'Synthetic Details Public Home', 'synthetic details public home', 'SYNTHETIC', 'UNI-038 synthetic details test fixture', 'ACTIVE'),
      ($2, 'BOARDING', 'Synthetic Details Area Home', 'synthetic details area home', 'SYNTHETIC', 'UNI-038 synthetic details test fixture', 'ACTIVE'),
      ($3, 'BOARDING', 'Synthetic Details Hidden Home', 'synthetic details hidden home', 'SYNTHETIC', 'UNI-038 synthetic details test fixture', 'ACTIVE')
  `, [publicId, areaId, hiddenId]);

  await client.query(`
    INSERT INTO public.boarding_properties(place_id, data_kind, visibility, general_locality, locality_consent, authorization_status, public_map_consent, map_consent_at, description)
    VALUES
      ($1, 'SYNTHETIC', 'HIDDEN', NULL, false, 'LOCAL_TEST_AUTHORIZED', false, NULL, 'Synthetic test property'),
      ($2, 'SYNTHETIC', 'AREA_ONLY', 'Synthetic Locality', true, 'LOCAL_TEST_AUTHORIZED', false, NULL, 'Synthetic test property'),
      ($3, 'SYNTHETIC', 'HIDDEN', NULL, false, 'LOCAL_TEST_AUTHORIZED', false, NULL, 'Synthetic test property')
  `, [publicId, areaId, hiddenId]);

  await client.query(`
    INSERT INTO public.listings(id, boarding_id, revision, publisher_kind, publication_status, title, description, visibility_snapshot, is_current, published_at)
    VALUES
      ($1, $4, 1, 'OWNER_OFFICIAL', 'PUBLISHED', 'Synthetic Details Public Home', '', 'HIDDEN', true, CURRENT_TIMESTAMP),
      ($2, $5, 1, 'OWNER_OFFICIAL', 'PUBLISHED', 'Synthetic Details Area Home', '', 'AREA_ONLY', true, CURRENT_TIMESTAMP),
      ($3, $6, 1, 'OWNER_OFFICIAL', 'PUBLISHED', 'Synthetic Details Hidden Home', '', 'HIDDEN', true, CURRENT_TIMESTAMP)
  `, [listing1, listing2, listing3, publicId, areaId, hiddenId]);

  await client.query(`
    INSERT INTO public.boarding_advertisement_previews(listing_id, boarding_id, data_kind, title, summary, visibility, locality, updated_at)
    VALUES
      ($1, $4, 'SYNTHETIC', 'Synthetic Details Public Home', 'Synthetic details test summary.', 'HIDDEN', NULL, CURRENT_TIMESTAMP),
      ($2, $5, 'SYNTHETIC', 'Synthetic Details Area Home', 'Synthetic details test summary.', 'AREA_ONLY', 'Synthetic Locality', CURRENT_TIMESTAMP),
      ($3, $6, 'SYNTHETIC', 'Synthetic Details Hidden Home', 'Synthetic details test summary.', 'HIDDEN', NULL, CURRENT_TIMESTAMP)
  `, [listing1, listing2, listing3, publicId, areaId, hiddenId]);

  try {
    // 1. When property is NOT PUBLIC_MAP, nearby essentials MUST return 404
    const preCheck = await get(`/api/v1/boardings/${publicId}/nearby-essentials`);
    assert.equal(preCheck.status, 404);

    const areaCheck = await get(`/api/v1/boardings/${areaId}/nearby-essentials`);
    assert.equal(areaCheck.status, 404);

    const hiddenCheck = await get(`/api/v1/boardings/${hiddenId}/nearby-essentials`);
    assert.equal(hiddenCheck.status, 404);

    // 2. Temporarily set publicId to PUBLIC_MAP with an authorized entrance at (0, 0)
    await client.query(`
      UPDATE public.boarding_properties
      SET visibility = 'PUBLIC_MAP', public_map_consent = true, authorization_status = 'LOCAL_TEST_AUTHORIZED', map_consent_at = CURRENT_TIMESTAMP
      WHERE place_id = $1
    `, [publicId]);

    await client.query(`
      INSERT INTO public.boarding_public_entrances (boarding_id, listing_id, purpose, entrance_geo, consent_at)
      VALUES ($1, $2, 'OWNER_SELECTED_PUBLIC_ENTRANCE', ST_SetSRID(ST_MakePoint(0, 0), 4326), CURRENT_TIMESTAMP)
      ON CONFLICT (boarding_id) DO UPDATE
      SET entrance_geo = ST_SetSRID(ST_MakePoint(0, 0), 4326), consent_at = CURRENT_TIMESTAMP
    `, [publicId, listing1]);

    // 3. Now nearby essentials for the PUBLIC_MAP boarding must succeed
    const res = await get(`/api/v1/boardings/${publicId}/nearby-essentials`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    const body = await res.json();
    assert.equal(body.boardingId, publicId);
    assert.equal(body.visibility, 'PUBLIC_MAP');
    assert.deepEqual(body.entrance, { lat: 0, lng: 0 });
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length > 0, 'Must find nearby synthetic POIs around (0,0)');

    // Verify distance ordering and values
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      assert.ok(typeof item.distanceMeters === 'number' && item.distanceMeters >= 0);
      assert.ok(item.category && item.category.code && item.category.label);
      assert.ok(item.location && typeof item.location.lat === 'number' && typeof item.location.lng === 'number');
      assert.equal(item.provenance.dataKind, 'SYNTHETIC');
      if (i > 0) {
        assert.ok(item.distanceMeters >= body.items[i - 1].distanceMeters, 'Items must be sorted by distance ascending');
      }
    }

    // 4. Test compare endpoint with both public and private boardings
    const compareRes = await get(`/api/v1/boardings/compare?ids=${publicId},${areaId},${hiddenId}`);
    assert.equal(compareRes.status, 200);
    assert.equal(compareRes.headers.get('cache-control'), 'no-store');
    const compareBody = await compareRes.json();
    assert.equal(compareBody.requestedCount, 3);
    assert.equal(compareBody.comparedCount, 3);

    const publicItem = compareBody.items.find((i) => i.id === publicId);
    const areaItem = compareBody.items.find((i) => i.id === areaId);
    const hiddenItem = compareBody.items.find((i) => i.id === hiddenId);

    assert.ok(publicItem && areaItem && hiddenItem);

    // Public map item has entrance and essentials
    assert.equal(publicItem.visibility, 'PUBLIC_MAP');
    assert.equal(publicItem.hasExactEntrance, true);
    assert.deepEqual(publicItem.entrance, { lat: 0, lng: 0 });
    assert.ok(Array.isArray(publicItem.nearbyEssentials));
    assert.ok(publicItem.nearbyEssentials.length > 0);

    // Area-only item strictly hides entrance and nearby essentials
    assert.equal(areaItem.visibility, 'AREA_ONLY');
    assert.equal(areaItem.hasExactEntrance, false);
    assert.equal(areaItem.entrance, null);
    assert.equal(areaItem.nearbyEssentials, null);
    assert.equal(typeof areaItem.locationLabel, 'string');

    // Hidden item strictly hides entrance, locationLabel, and nearby essentials
    assert.equal(hiddenItem.visibility, 'HIDDEN');
    assert.equal(hiddenItem.hasExactEntrance, false);
    assert.equal(hiddenItem.entrance, null);
    assert.equal(hiddenItem.nearbyEssentials, null);
    assert.equal(hiddenItem.locationLabel, null);

    // Verify invalid compare queries fail validation with 400
    assert.equal((await get('/api/v1/boardings/compare')).status, 400);
    assert.equal((await get('/api/v1/boardings/compare?ids=')).status, 400);
    assert.equal((await get('/api/v1/boardings/compare?ids=invalid-uuid')).status, 400);

    console.log('PASS: UNI-038 real PostGIS nearby essentials and comparison matrix enforce public-only geometry and essentials');
  } finally {
    await client.query(`DELETE FROM public.boarding_public_entrances WHERE boarding_id = $1`, [publicId]);
    await client.query(`DELETE FROM public.boarding_advertisement_previews WHERE boarding_id = ANY($1::uuid[])`, [[publicId, areaId, hiddenId]]);
    await client.query(`DELETE FROM public.listings WHERE boarding_id = ANY($1::uuid[])`, [[publicId, areaId, hiddenId]]);
    await client.query(`DELETE FROM public.boarding_properties WHERE place_id = ANY($1::uuid[])`, [[publicId, areaId, hiddenId]]);
    await client.query(`DELETE FROM public.places WHERE id = ANY($1::uuid[])`, [[publicId, areaId, hiddenId]]);
  }
}
