-- Update any hardcoded OnyxTech references
-- in existing tenant data

UPDATE tenants
  SET mentor_name = REPLACE(
    mentor_name, 'OnyxTech', 'Ephata Tech'
  )
WHERE mentor_name ILIKE '%onyxtech%';

-- Update the master tenant if it exists
UPDATE tenants
  SET mentor_name = 'Ephata Master'
WHERE tenant_id = '6552467058'
  OR mentor_name = 'Onyx Master';
