INSERT INTO tblDonor(Name, Type) VALUES
('FreshMart', 'Supermarket'),
('City Kitchen', 'Restaurant');

INSERT INTO tblProduct(name, Category, Unit_Weight_kg, Temp_Requirement) VALUES
('Milk', 'Dairy', 1.0, 'Chilled'),
('Rice', 'Grain', 5.0, 'Ambient');

INSERT INTO tblStorageZone(Zone_Name, Temp_Band, Capacity_kg) VALUES
('Chilled-A', 'Chilled', 500),
('Ambient-A', 'Ambient', 1000);

INSERT INTO tblBeneficiary(Beneficiary_Name, District, Has_Cold_Storage) VALUES
('Community Centre A', 'Central', true),
('Elderly Home B', 'Kowloon', false);
