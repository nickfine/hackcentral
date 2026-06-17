-- Backup taken 2026-06-17 before clearing isFreeAgent on all flagged users
-- (request: level everyone to equal "registered, not flagged" status so nobody is auto-assigned at hacking)
-- To RESTORE the exact prior state, run this UPDATE:

UPDATE "User" SET "isFreeAgent" = true
WHERE id IN (
  'user-1caeafad-5dca-478e-92d7-b9b1f4333a3b', -- Abigail Mah
  'user-dbe73cb0-73f6-459f-b76b-d73c1cb69f7e', -- Adaptavist IT
  'user-1aab7a55-4619-4def-9dab-e48ef04e28bd', -- Alex Antón Madero
  'user-1c52761a-888d-485a-8e79-c5010ccef7b4', -- Chloe Tsappis
  'user-cc5cb0e8-e20e-4761-83ef-cefe4667ba7c', -- Courage Ugwuanyi
  'user-b45c94b8-8bf2-4b0c-8f8d-97ae58ec5f64', -- Damian Lagan
  'user-bd18b3fd-ddb3-4740-91a3-0805984bc98b', -- Dan Burgess
  'user-c7d19a04-a6df-406a-9f9d-fa0a6f4303ee', -- Daniel Adams
  'user-f4d11b60-b4be-4631-8868-c059af3aae12', -- David Diperna
  'user-876a8171-8dc8-4923-89a0-20d8c4dee546', -- Debbie Gacutan-Jardim de Oliveira
  'user-e873db19-31aa-416c-9372-e41b524162a5', -- Deniz Timartas
  'user-970f9be3-8cdb-4c34-b9d1-2e483a6e3b82', -- Doris Jordan
  'user-4a352ad1-f1a7-4b14-b54a-dbe1ed9fb698', -- Electra Astreinidou
  'user-a9f35fab-f784-4aa2-8da3-a5cd2bde51fd', -- Elena Bergamaschi
  'user-376558b4-ca84-4e07-981f-732de86637c4', -- Elena Francis
  'user-d81881d7-4280-44ca-9cf5-1be3f767cf11', -- Emma McBride
  'user-4f446914-9814-45fb-baf6-89f85c926a74', -- Emma Weston
  'user-f7f5716c-aacd-4931-8ecb-d8e302c3fe07', -- Ewan Cameron
  'user-d90af13f-d667-4209-bef0-f130a6068968', -- Fatmeh Shuman
  'user-39479057-ae79-4ad1-9b0c-79bebd4d35b8', -- Georges Petrequin
  'user-f29adad1-2659-4f85-9f38-0165ea587cd4', -- Giri Ram
  'user-1d43856b-febc-480e-b662-df91f4c914b4', -- Gunars Vucens
  'user-8dd44e6e-0f0d-49b1-b0af-f22ebd3b6fba', -- Gustaf Stenlund
  'user-b91f5cff-510c-4eeb-905b-b9d5003cc4e1', -- Heather Murray
  'user-cbe1c909-75ce-4d96-b20e-1da253a2c038', -- Hols Aspinall
  'user-4b1c77eb-2388-469f-b844-4425c8007e02', -- Ian Arrowsmith
  'user-270c7c36-0366-44ac-8224-d7ac843da16e', -- Inna Frusovich
  'user-db7f2869-47c4-40cf-a4b2-be06bd7d5ac7', -- jari
  'user-d8209210-e15c-4642-a98d-0ea04d157364', -- Javi Vallinas
  'user-f213b70d-a3cf-465f-96e3-041edbc32980', -- Jess Thompson
  'user-e6b98d6a-d015-4753-9a9a-797967c88593', -- Jon Kern
  'user-9e6515ed-91b2-472f-a55b-6f6f61d7987d', -- Julio Prižmić
  'user-83e1b29d-3019-4430-bf97-01ba416c9f79', -- Jun Kin Chai
  'user-76658d78-6e57-4fac-9610-2f2c0244734c', -- Jyoti Jaswani
  'user-b1fa8bdb-5bb0-4e98-92b6-be247e5633d9', -- Karl Dickman
  'user-41203d34-2c7d-48cf-a8cb-680be12ede28', -- Katrina Wellbelove
  'user-d9d3d069-6cb7-4c6a-8faa-878052279537', -- Kelly Waller
  'user-05a236da-6f78-4b4c-8c75-0a18abd39fe5', -- Krista Parker
  'user-e757e060-48bb-4ba2-ac49-f2405c816f3b', -- Kristian Walker
  'user-932cbf3a-b11c-4f05-8b72-a37ffacd8753', -- Lacy Saute
  'user-474fc773-bd43-4373-b7db-4e38f8e57f50', -- Lauren Cooper
  'user-4908bf79-6779-458f-8115-bfc529d4273b', -- Lilly Holden
  'user-0222404f-074b-4fed-88b2-5c7be1fd43dc', -- Lisa Schaffer
  'user-398ffa10-dc9a-456c-a5d3-a94395c1aad6', -- Markus Kobold
  'user-29429712-72b1-4ae1-aa8a-04731697e8ba', -- Martin Sherwood
  'user-8608ac2c-b5a4-4ee6-a84e-68ebaffc58b9', -- Matt Doar
  'user-dbc8bc09-dfbc-4008-b89f-ddb00bf7faf1', -- Matt Jones
  'user-45f52d08-8bea-4f6b-b762-7625e82612b8', -- Matt Saunders
  'user-31fe41d9-7c9f-4b61-85e7-987dff99e144', -- Matt Treacy
  'user-dd52f46b-da94-48e3-8d4d-411f0fbc0b20', -- Nandish Solanki
  'user-265cde03-829c-4bee-ae6e-2d81c1debf93', -- Nigel Alvares
  'user-aa6a32ff-34d5-46d0-a2d0-b4f676d32e86', -- Nikki Wick
  'user-cf5249c7-5f46-4c0b-b71d-d93ecee90133', -- Niko Nedoklanov
  'user-fd1376c6-4611-407e-8def-b83549081e4a', -- Olivia Shephard
  'user-fb0ec597-4e6c-49d8-a7cc-2835a4a06ebc', -- Paul Cavanagh
  'user-ed639ae5-0540-4322-9201-942d48f505d4', -- Paul Cutting
  'user-4d008b62-fa51-4691-8bfb-176cec4dd964', -- Paul Slootweg
  'user-d19550b2-4798-4a14-8d13-cdbb48561ccb', -- Priyanka Nagaraju
  'user-ebb9b7e0-b7d4-47c9-89ba-731606bf625b', -- Qulsum Mcgarry
  'user-3b216693-4645-4f4f-a598-d1d3f660a9be', -- Radu Ichim
  'user-3c3dcecd-3c5c-43ab-b3ba-031b75c86989', -- Rhiannon Miller
  'user-9759bd66-8666-401e-a3c0-3f832f0373ad', -- Rich (Blunty) Blunt
  'user-f1b66633-659f-4581-b8d6-f9ecded9a7d6', -- Richard George
  'user-58938511-ce1a-4fa7-b1bd-c33fa3e24029', -- Rob Bayliss
  'user-9c43a414-a4f7-4886-a2d0-f75e2611cb79', -- Romy Greenfield
  'user-b11d7311-bbf6-48cb-8e7a-3689f63c87cd', -- Sam Steele
  'user-a20d825e-dff8-43e4-b341-47e5f71b34cc', -- Sasha P
  'user-ef8300e7-3657-456d-9654-099fe3fb2aa1', -- Sathish Mamidala
  'user-ae61ae6a-9540-485e-9e02-ec5f5f7ca0c3', -- Sergiy Bryzhko
  'user-66b6b959-17f8-4d95-a089-14fa3fa88c8c', -- Shawn Danisa
  'user-9fc3bb3a-dae8-4f16-9b46-246ec5d7c400', -- Shona Gilchrist
  'user-e838dbbc-ed50-46d5-a3d8-d156a2f1280f', -- Shruthi Rajaram
  'user-a005f128-4d81-485a-aac7-b56dbffdbc08', -- Simon Kirrane
  'user-2dc28f49-e978-4adf-9202-219ed17e711c', -- Swetha Krishnagopal
  'user-337c7fb8-cb9f-4c31-98da-8e31a9a687c6', -- Tiffany Martindale
  'user-208ece0b-c59d-40fc-8103-a228e3f13d69', -- Timothy Chin
  'user-47f83302-4213-4d43-8334-aa5f42b2b4a3', -- Verity Blake
  'user-aa13f0d8-20ef-4804-95bd-7b744964771d', -- Will Davis
  'user-0819f40b-e6b2-4fe7-949b-ef929458cd83', -- William Tong
  'user-bd9e7efd-a7b8-4662-92e7-cad07b6e2b32', -- Wyatt Henderson
  'user-114ae8fb-cf20-4a02-a210-94e484bfb5cf', -- Yevheniia Korzhnieva
  'user-f9199462-ef9a-4758-a54b-082e942c8467', -- Yulia Core
  'user-03cb1d01-81bc-4dc2-9563-cf46d6010210'  -- Zoi Raskou
);
