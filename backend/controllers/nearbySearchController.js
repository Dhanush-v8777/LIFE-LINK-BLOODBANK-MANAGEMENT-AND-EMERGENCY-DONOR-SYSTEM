const db = require('../config/db');

/**
 * Predefined city coordinates for fallback location (when GPS unavailable).
 * Covers major Indian cities + Springfield (for seed data demo).
 */
const CITY_COORDINATES = {
  'Springfield': { lat: 39.7817, lng: -89.6501 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Kolkata': { lat: 22.5726, lng: 88.3639 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'Jaipur': { lat: 26.9124, lng: 75.7873 },
  'Lucknow': { lat: 26.8467, lng: 80.9462 },
  'Chandigarh': { lat: 30.7333, lng: 76.7794 },
  'Bhopal': { lat: 23.2599, lng: 77.4126 },
  'Indore': { lat: 22.7196, lng: 75.8577 },
  'Nagpur': { lat: 21.1458, lng: 79.0882 },
  'Patna': { lat: 25.6093, lng: 85.1376 },
  'Kochi': { lat: 9.9312, lng: 76.2673 },
  'Coimbatore': { lat: 11.0168, lng: 76.9558 },
  'Visakhapatnam': { lat: 17.6868, lng: 83.2185 },
  'Thiruvananthapuram': { lat: 8.5241, lng: 76.9366 },
};

/**
 * GET /api/nearby/search
 * 
 * Search for nearby donors, hospitals, and blood banks by blood group and location.
 * Results are sorted by distance (nearest first).
 * 
 * Query params:
 *   - bloodGroup (required): A+, A-, B+, B-, AB+, AB-, O+, O-
 *   - latitude, longitude: GPS coordinates (preferred)
 *   - city: City name (fallback if no GPS)
 *   - pincode: PIN code (fallback if no GPS and no city)
 *   - radiusKm: Search radius in km (default 50, max 200)
 */
exports.searchNearby = async (req, res) => {
  const { bloodGroup, latitude, longitude, city, pincode, radiusKm } = req.query;

  // Validate blood group
  const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  if (!bloodGroup || !validGroups.includes(bloodGroup)) {
    return res.status(400).json({
      success: false,
      message: 'Valid blood group is required (A+, A-, B+, B-, AB+, AB-, O+, O-)'
    });
  }

  // Resolve user location priority:
  // Priority 1: Query lat/lng
  // Priority 2: Patient's saved profile lat/lng
  // Priority 3: City lookup / PIN code lookup
  let userLat = parseFloat(latitude);
  let userLng = parseFloat(longitude);
  let locationSource = 'gps';

  if (isNaN(userLat) || isNaN(userLng)) {
    if (req.user && req.user.id) {
      try {
        const [patRows] = await db.query('SELECT latitude, longitude, city FROM patients WHERE user_id = ?', [req.user.id]);
        if (patRows.length > 0 && patRows[0].latitude && patRows[0].longitude) {
          userLat = parseFloat(patRows[0].latitude);
          userLng = parseFloat(patRows[0].longitude);
          locationSource = 'patient_profile';
        }
      } catch (err) {
        console.error('Patient profile location lookup error:', err);
      }
    }
  }

  if (isNaN(userLat) || isNaN(userLng)) {
    // Fallback 1: City lookup
    if (city && CITY_COORDINATES[city]) {
      userLat = CITY_COORDINATES[city].lat;
      userLng = CITY_COORDINATES[city].lng;
      locationSource = 'city';
    }
    // Fallback 2: Pincode lookup
    else if (pincode) {
      try {
        const [pincodeResults] = await db.query(
          `SELECT latitude, longitude FROM (
            SELECT latitude, longitude FROM donors WHERE pincode = ? AND latitude IS NOT NULL
            UNION ALL
            SELECT latitude, longitude FROM hospitals WHERE pincode = ? AND latitude IS NOT NULL
            UNION ALL
            SELECT latitude, longitude FROM blood_banks WHERE pincode = ? AND latitude IS NOT NULL
            UNION ALL
            SELECT latitude, longitude FROM patients WHERE pincode = ? AND latitude IS NOT NULL
          ) AS combined LIMIT 1`,
          [pincode, pincode, pincode, pincode]
        );
        if (pincodeResults.length > 0) {
          userLat = parseFloat(pincodeResults[0].latitude);
          userLng = parseFloat(pincodeResults[0].longitude);
          locationSource = 'pincode';
        }
      } catch (err) {
        console.error('Pincode lookup error:', err);
      }
    }

    if (isNaN(userLat) || isNaN(userLng)) {
      // Default Springfield seed dataset coordinates
      userLat = 39.7817;
      userLng = -89.6501;
      locationSource = 'default';
    }
  }

  // Enforce strict 20 KM maximum radius
  const radius = 20;

  // Haversine formula SQL snippet (returns distance in km)
  const haversine = (latCol, lngCol) => `
    (6371 * ACOS(
      LEAST(1, GREATEST(-1,
        COS(RADIANS(?)) * COS(RADIANS(${latCol})) *
        COS(RADIANS(${lngCol}) - RADIANS(?)) +
        SIN(RADIANS(?)) * SIN(RADIANS(${latCol}))
      ))
    ))
  `;

  // Blood compatibility map
  const compatibilityMap = {
    'O-':  ['O-'],
    'O+':  ['O+', 'O-'],
    'A-':  ['A-', 'O-'],
    'A+':  ['A+', 'A-', 'O+', 'O-'],
    'B-':  ['B-', 'O-'],
    'B+':  ['B+', 'B-', 'O+', 'O-'],
    'AB-': ['AB-', 'A-', 'B-', 'O-'],
    'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
  };
  const compatibleGroups = compatibilityMap[bloodGroup] || [bloodGroup];
  const donorGroupPlaceholders = compatibleGroups.map(() => '?').join(',');

  try {
    // ─── 1. Nearby Eligible Donors ───
    const donorDistanceExpr = haversine('d.latitude', 'd.longitude');
    const [nearbyDonors] = await db.query(
      `SELECT 
        d.id AS donor_id,
        u.name,
        d.blood_group,
        d.availability_status,
        d.last_donation_date,
        d.next_eligible_date,
        d.address,
        d.city,
        d.phone,
        ${donorDistanceExpr} AS distance_km,
        CASE 
          WHEN d.next_eligible_date IS NULL OR d.next_eligible_date <= CURDATE() 
          THEN 'Eligible' 
          ELSE 'In Cooldown' 
        END AS eligibility_status
      FROM donors d
      JOIN users u ON d.user_id = u.id
      WHERE d.blood_group IN (${donorGroupPlaceholders})
        AND d.availability_status = 'Available'
        AND u.is_verified = 1
        AND (d.next_eligible_date IS NULL OR d.next_eligible_date <= CURDATE())
        AND d.latitude IS NOT NULL
        AND d.longitude IS NOT NULL
        AND ${donorDistanceExpr} <= ?
      ORDER BY distance_km ASC`,
      [userLat, userLng, userLat, ...compatibleGroups, userLat, userLng, userLat, radius]
    );

    // ─── 2. Nearby Hospitals ───
    const hospitalDistanceExpr = haversine('h.latitude', 'h.longitude');
    const [nearbyHospitals] = await db.query(
      `SELECT 
        h.id,
        h.name,
        h.address,
        h.phone,
        h.contact_person,
        h.city,
        ${hospitalDistanceExpr} AS distance_km
      FROM hospitals h
      JOIN users u ON h.user_id = u.id
      WHERE u.is_verified = 1
        AND h.latitude IS NOT NULL
        AND h.longitude IS NOT NULL
        AND ${hospitalDistanceExpr} <= ?
      ORDER BY distance_km ASC`,
      [userLat, userLng, userLat, userLat, userLng, userLat, radius]
    );

    // For each hospital, get available blood groups from any linked blood bank inventory
    // (Hospitals themselves don't hold inventory, so we show general info)
    // We'll add a list of available blood groups from the system for context
    const [allAvailableGroups] = await db.query(
      `SELECT DISTINCT bi.blood_group 
       FROM blood_inventory bi 
       WHERE bi.status = 'Available' AND bi.expiry_date >= CURDATE() AND bi.volume_ml > 0
       ORDER BY bi.blood_group`
    );
    const availableGroupsList = allAvailableGroups.map(r => r.blood_group);

    // Attach available blood groups to each hospital
    const hospitalsWithGroups = nearbyHospitals.map(h => ({
      ...h,
      available_blood_groups: availableGroupsList
    }));

    // ─── 3. Nearby Blood Banks ───
    const bbDistanceExpr = haversine('bb.latitude', 'bb.longitude');
    const [nearbyBloodBanks] = await db.query(
      `SELECT 
        bb.id,
        bb.name,
        bb.address,
        bb.phone,
        bb.contact_person,
        bb.city,
        ${bbDistanceExpr} AS distance_km,
        COALESCE(SUM(CASE WHEN bi.blood_group = ? AND bi.status = 'Available' AND bi.expiry_date >= CURDATE() THEN bi.units ELSE 0 END), 0) AS available_units,
        COALESCE(SUM(CASE WHEN bi.blood_group = ? AND bi.status = 'Available' AND bi.expiry_date >= CURDATE() THEN bi.volume_ml ELSE 0 END), 0) AS available_volume_ml
      FROM blood_banks bb
      JOIN users u ON bb.user_id = u.id
      LEFT JOIN blood_inventory bi ON bi.blood_bank_id = bb.id
      WHERE u.is_verified = 1
        AND bb.latitude IS NOT NULL
        AND bb.longitude IS NOT NULL
        AND ${bbDistanceExpr} <= ?
      GROUP BY bb.id, bb.name, bb.address, bb.phone, bb.contact_person, bb.city, bb.latitude, bb.longitude
      ORDER BY distance_km ASC`,
      [userLat, userLng, userLat, bloodGroup, bloodGroup, userLat, userLng, userLat, radius]
    );

    return res.status(200).json({
      success: true,
      bloodGroup,
      locationSource,
      radiusKm: radius,
      nearbyDonors: nearbyDonors.map(d => ({
        ...d,
        distance_km: parseFloat(parseFloat(d.distance_km).toFixed(2))
      })),
      nearbyHospitals: hospitalsWithGroups.map(h => ({
        ...h,
        distance_km: parseFloat(parseFloat(h.distance_km).toFixed(2))
      })),
      nearbyBloodBanks: nearbyBloodBanks.map(bb => ({
        ...bb,
        distance_km: parseFloat(parseFloat(bb.distance_km).toFixed(2))
      })),
      counts: {
        donors: nearbyDonors.length,
        hospitals: nearbyHospitals.length,
        bloodBanks: nearbyBloodBanks.length
      }
    });
  } catch (error) {
    console.error('Nearby search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform nearby search. Please try again.'
    });
  }
};

/**
 * GET /api/nearby/cities
 * Returns list of available cities for the location fallback dropdown.
 */
exports.getCities = async (req, res) => {
  try {
    const cities = Object.keys(CITY_COORDINATES).sort().map(name => ({
      name,
      latitude: CITY_COORDINATES[name].lat,
      longitude: CITY_COORDINATES[name].lng
    }));
    return res.status(200).json({ success: true, cities });
  } catch (error) {
    console.error('Get cities error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve cities list' });
  }
};
