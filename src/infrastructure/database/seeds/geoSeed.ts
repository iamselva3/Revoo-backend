import { IndiaStateModel, IndiaLocationModel } from '../models/IndiaLocation.js';

export const ALL_INDIA_STATES = [
  // 28 States
  { name: 'Andhra Pradesh', code: 'AP', type: 'State', displayOrder: 1 },
  { name: 'Arunachal Pradesh', code: 'AR', type: 'State', displayOrder: 2 },
  { name: 'Assam', code: 'AS', type: 'State', displayOrder: 3 },
  { name: 'Bihar', code: 'BR', type: 'State', displayOrder: 4 },
  { name: 'Chhattisgarh', code: 'CG', type: 'State', displayOrder: 5 },
  { name: 'Goa', code: 'GA', type: 'State', displayOrder: 6 },
  { name: 'Gujarat', code: 'GJ', type: 'State', displayOrder: 7 },
  { name: 'Haryana', code: 'HR', type: 'State', displayOrder: 8 },
  { name: 'Himachal Pradesh', code: 'HP', type: 'State', displayOrder: 9 },
  { name: 'Jharkhand', code: 'JH', type: 'State', displayOrder: 10 },
  { name: 'Karnataka', code: 'KA', type: 'State', displayOrder: 11 },
  { name: 'Kerala', code: 'KL', type: 'State', displayOrder: 12 },
  { name: 'Madhya Pradesh', code: 'MP', type: 'State', displayOrder: 13 },
  { name: 'Maharashtra', code: 'MH', type: 'State', displayOrder: 14 },
  { name: 'Manipur', code: 'MN', type: 'State', displayOrder: 15 },
  { name: 'Meghalaya', code: 'ML', type: 'State', displayOrder: 16 },
  { name: 'Mizoram', code: 'MZ', type: 'State', displayOrder: 17 },
  { name: 'Nagaland', code: 'NL', type: 'State', displayOrder: 18 },
  { name: 'Odisha', code: 'OR', type: 'State', displayOrder: 19 },
  { name: 'Punjab', code: 'PB', type: 'State', displayOrder: 20 },
  { name: 'Rajasthan', code: 'RJ', type: 'State', displayOrder: 21 },
  { name: 'Sikkim', code: 'SK', type: 'State', displayOrder: 22 },
  { name: 'Tamil Nadu', code: 'TN', type: 'State', displayOrder: 23 },
  { name: 'Telangana', code: 'TS', type: 'State', displayOrder: 24 },
  { name: 'Tripura', code: 'TR', type: 'State', displayOrder: 25 },
  { name: 'Uttar Pradesh', code: 'UP', type: 'State', displayOrder: 26 },
  { name: 'Uttarakhand', code: 'UK', type: 'State', displayOrder: 27 },
  { name: 'West Bengal', code: 'WB', type: 'State', displayOrder: 28 },

  // 8 Union Territories
  { name: 'Andaman and Nicobar Islands', code: 'AN', type: 'Union Territory', displayOrder: 29 },
  { name: 'Chandigarh', code: 'CH', type: 'Union Territory', displayOrder: 30 },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DH', type: 'Union Territory', displayOrder: 31 },
  { name: 'Delhi', code: 'DL', type: 'Union Territory', displayOrder: 32 },
  { name: 'Jammu and Kashmir', code: 'JK', type: 'Union Territory', displayOrder: 33 },
  { name: 'Ladakh', code: 'LA', type: 'Union Territory', displayOrder: 34 },
  { name: 'Lakshadweep', code: 'LD', type: 'Union Territory', displayOrder: 35 },
  { name: 'Puducherry', code: 'PY', type: 'Union Territory', displayOrder: 36 },
];

export const INITIAL_CITIES_AND_PINCODES = [
  // Tamil Nadu
  { city: 'Chennai', district: 'Chennai', state: 'Tamil Nadu', pincode: '600001', isPopular: true },
  { city: 'Coimbatore', district: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', isPopular: true },
  { city: 'Madurai', district: 'Madurai', state: 'Tamil Nadu', pincode: '625001', isPopular: true },
  { city: 'Tiruchirappalli', district: 'Tiruchirappalli', state: 'Tamil Nadu', pincode: '620001', isPopular: true },
  { city: 'Salem', district: 'Salem', state: 'Tamil Nadu', pincode: '636001', isPopular: true },
  { city: 'Tirunelveli', district: 'Tirunelveli', state: 'Tamil Nadu', pincode: '627001' },
  { city: 'Tiruppur', district: 'Tiruppur', state: 'Tamil Nadu', pincode: '641601' },
  { city: 'Erode', district: 'Erode', state: 'Tamil Nadu', pincode: '638001' },
  { city: 'Vellore', district: 'Vellore', state: 'Tamil Nadu', pincode: '632001' },
  { city: 'Thoothukudi', district: 'Thoothukudi', state: 'Tamil Nadu', pincode: '628001' },
  { city: 'Dindigul', district: 'Dindigul', state: 'Tamil Nadu', pincode: '624001' },
  { city: 'Thanjavur', district: 'Thanjavur', state: 'Tamil Nadu', pincode: '613001' },
  { city: 'Kanchipuram', district: 'Kanchipuram', state: 'Tamil Nadu', pincode: '631501' },
  { city: 'Nagercoil', district: 'Kanyakumari', state: 'Tamil Nadu', pincode: '629001' },
  { city: 'Cuddalore', district: 'Cuddalore', state: 'Tamil Nadu', pincode: '607001' },
  { city: 'Kumbakonam', district: 'Thanjavur', state: 'Tamil Nadu', pincode: '612001' },
  { city: 'Hosur', district: 'Krishnagiri', state: 'Tamil Nadu', pincode: '635109' },

  // Maharashtra
  { city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', pincode: '400001', isPopular: true },
  { city: 'Pune', district: 'Pune', state: 'Maharashtra', pincode: '411001', isPopular: true },
  { city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', pincode: '440001', isPopular: true },
  { city: 'Thane', district: 'Thane', state: 'Maharashtra', pincode: '400601', isPopular: true },
  { city: 'Nashik', district: 'Nashik', state: 'Maharashtra', pincode: '422001', isPopular: true },
  { city: 'Chhatrapati Sambhajinagar', district: 'Aurangabad', state: 'Maharashtra', pincode: '431001' },
  { city: 'Navi Mumbai', district: 'Thane', state: 'Maharashtra', pincode: '400703' },
  { city: 'Solapur', district: 'Solapur', state: 'Maharashtra', pincode: '413001' },
  { city: 'Kolhapur', district: 'Kolhapur', state: 'Maharashtra', pincode: '416001' },
  { city: 'Amravati', district: 'Amravati', state: 'Maharashtra', pincode: '444601' },
  { city: 'Nanded', district: 'Nanded', state: 'Maharashtra', pincode: '431601' },
  { city: 'Jalgaon', district: 'Jalgaon', state: 'Maharashtra', pincode: '425001' },
  { city: 'Akola', district: 'Akola', state: 'Maharashtra', pincode: '444001' },

  // Karnataka
  { city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560001', isPopular: true },
  { city: 'Mysuru', district: 'Mysuru', state: 'Karnataka', pincode: '570001', isPopular: true },
  { city: 'Hubballi', district: 'Dharwad', state: 'Karnataka', pincode: '580020', isPopular: true },
  { city: 'Mangaluru', district: 'Dakshina Kannada', state: 'Karnataka', pincode: '575001', isPopular: true },
  { city: 'Belagavi', district: 'Belagavi', state: 'Karnataka', pincode: '590001' },
  { city: 'Davanagere', district: 'Davanagere', state: 'Karnataka', pincode: '577001' },
  { city: 'Ballari', district: 'Ballari', state: 'Karnataka', pincode: '583101' },
  { city: 'Vijayapura', district: 'Vijayapura', state: 'Karnataka', pincode: '586101' },
  { city: 'Shivamogga', district: 'Shivamogga', state: 'Karnataka', pincode: '577201' },
  { city: 'Tumakuru', district: 'Tumakuru', state: 'Karnataka', pincode: '572101' },
  { city: 'Kalaburagi', district: 'Kalaburagi', state: 'Karnataka', pincode: '585101' },
  { city: 'Udupi', district: 'Udupi', state: 'Karnataka', pincode: '576101' },

  // Telangana
  { city: 'Hyderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500001', isPopular: true },
  { city: 'Warangal', district: 'Warangal', state: 'Telangana', pincode: '506001', isPopular: true },
  { city: 'Nizamabad', district: 'Nizamabad', state: 'Telangana', pincode: '503001' },
  { city: 'Karimnagar', district: 'Karimnagar', state: 'Telangana', pincode: '505001' },
  { city: 'Ramagundam', district: 'Peddapalli', state: 'Telangana', pincode: '505208' },
  { city: 'Khammam', district: 'Khammam', state: 'Telangana', pincode: '507001' },
  { city: 'Mahbubnagar', district: 'Mahbubnagar', state: 'Telangana', pincode: '509001' },
  { city: 'Secunderabad', district: 'Hyderabad', state: 'Telangana', pincode: '500003' },

  // Delhi (UT)
  { city: 'New Delhi', district: 'New Delhi', state: 'Delhi', pincode: '110001', isPopular: true },
  { city: 'Delhi', district: 'Central Delhi', state: 'Delhi', pincode: '110006', isPopular: true },
  { city: 'North Delhi', district: 'North Delhi', state: 'Delhi', pincode: '110007' },
  { city: 'South Delhi', district: 'South Delhi', state: 'Delhi', pincode: '110017' },
  { city: 'West Delhi', district: 'West Delhi', state: 'Delhi', pincode: '110027' },
  { city: 'East Delhi', district: 'East Delhi', state: 'Delhi', pincode: '110092' },
  { city: 'Dwarka', district: 'South West Delhi', state: 'Delhi', pincode: '110075' },

  // Uttar Pradesh
  { city: 'Lucknow', district: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', isPopular: true },
  { city: 'Kanpur', district: 'Kanpur Nagar', state: 'Uttar Pradesh', pincode: '208001', isPopular: true },
  { city: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', pincode: '221001', isPopular: true },
  { city: 'Agra', district: 'Agra', state: 'Uttar Pradesh', pincode: '282001', isPopular: true },
  { city: 'Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', pincode: '201301', isPopular: true },
  { city: 'Greater Noida', district: 'Gautam Buddha Nagar', state: 'Uttar Pradesh', pincode: '201310' },
  { city: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201001', isPopular: true },
  { city: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh', pincode: '211001' },
  { city: 'Meerut', district: 'Meerut', state: 'Uttar Pradesh', pincode: '250001' },
  { city: 'Bareilly', district: 'Bareilly', state: 'Uttar Pradesh', pincode: '243001' },
  { city: 'Aligarh', district: 'Aligarh', state: 'Uttar Pradesh', pincode: '202001' },
  { city: 'Moradabad', district: 'Moradabad', state: 'Uttar Pradesh', pincode: '244001' },
  { city: 'Gorakhpur', district: 'Gorakhpur', state: 'Uttar Pradesh', pincode: '273001' },
  { city: 'Mathura', district: 'Mathura', state: 'Uttar Pradesh', pincode: '281001' },
  { city: 'Ayodhya', district: 'Ayodhya', state: 'Uttar Pradesh', pincode: '224123' },

  // Gujarat
  { city: 'Ahmedabad', district: 'Ahmedabad', state: 'Gujarat', pincode: '380001', isPopular: true },
  { city: 'Surat', district: 'Surat', state: 'Gujarat', pincode: '395001', isPopular: true },
  { city: 'Vadodara', district: 'Vadodara', state: 'Gujarat', pincode: '390001', isPopular: true },
  { city: 'Rajkot', district: 'Rajkot', state: 'Gujarat', pincode: '360001', isPopular: true },
  { city: 'Bhavnagar', district: 'Bhavnagar', state: 'Gujarat', pincode: '364001' },
  { city: 'Jamnagar', district: 'Jamnagar', state: 'Gujarat', pincode: '361001' },
  { city: 'Gandhinagar', district: 'Gandhinagar', state: 'Gujarat', pincode: '382010' },
  { city: 'Junagadh', district: 'Junagadh', state: 'Gujarat', pincode: '362001' },
  { city: 'Anand', district: 'Anand', state: 'Gujarat', pincode: '388001' },

  // West Bengal
  { city: 'Kolkata', district: 'Kolkata', state: 'West Bengal', pincode: '700001', isPopular: true },
  { city: 'Howrah', district: 'Howrah', state: 'West Bengal', pincode: '711101', isPopular: true },
  { city: 'Siliguri', district: 'Darjeeling', state: 'West Bengal', pincode: '734001', isPopular: true },
  { city: 'Durgapur', district: 'Paschim Bardhaman', state: 'West Bengal', pincode: '713201' },
  { city: 'Asansol', district: 'Paschim Bardhaman', state: 'West Bengal', pincode: '713301' },
  { city: 'Kharagpur', district: 'Paschim Medinipur', state: 'West Bengal', pincode: '721301' },

  // Rajasthan
  { city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', pincode: '302001', isPopular: true },
  { city: 'Jodhpur', district: 'Jodhpur', state: 'Rajasthan', pincode: '342001', isPopular: true },
  { city: 'Udaipur', district: 'Udaipur', state: 'Rajasthan', pincode: '313001', isPopular: true },
  { city: 'Kota', district: 'Kota', state: 'Rajasthan', pincode: '324001', isPopular: true },
  { city: 'Bikaner', district: 'Bikaner', state: 'Rajasthan', pincode: '334001' },
  { city: 'Ajmer', district: 'Ajmer', state: 'Rajasthan', pincode: '305001' },
  { city: 'Bhilwara', district: 'Bhilwara', state: 'Rajasthan', pincode: '311001' },
  { city: 'Alwar', district: 'Alwar', state: 'Rajasthan', pincode: '301001' },

  // Kerala
  { city: 'Kochi', district: 'Ernakulam', state: 'Kerala', pincode: '682001', isPopular: true },
  { city: 'Thiruvananthapuram', district: 'Thiruvananthapuram', state: 'Kerala', pincode: '695001', isPopular: true },
  { city: 'Kozhikode', district: 'Kozhikode', state: 'Kerala', pincode: '673001', isPopular: true },
  { city: 'Thrissur', district: 'Thrissur', state: 'Kerala', pincode: '680001' },
  { city: 'Kollam', district: 'Kollam', state: 'Kerala', pincode: '691001' },
  { city: 'Palakkad', district: 'Palakkad', state: 'Kerala', pincode: '678001' },
  { city: 'Alappuzha', district: 'Alappuzha', state: 'Kerala', pincode: '688001' },
  { city: 'Kannur', district: 'Kannur', state: 'Kerala', pincode: '670001' },

  // Andhra Pradesh
  { city: 'Visakhapatnam', district: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530001', isPopular: true },
  { city: 'Vijayawada', district: 'NTR', state: 'Andhra Pradesh', pincode: '520001', isPopular: true },
  { city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', pincode: '522001', isPopular: true },
  { city: 'Nellore', district: 'SPSR Nellore', state: 'Andhra Pradesh', pincode: '524001' },
  { city: 'Kurnool', district: 'Kurnool', state: 'Andhra Pradesh', pincode: '518001' },
  { city: 'Tirupati', district: 'Tirupati', state: 'Andhra Pradesh', pincode: '517501', isPopular: true },
  { city: 'Rajahmundry', district: 'East Godavari', state: 'Andhra Pradesh', pincode: '533101' },
  { city: 'Kakinada', district: 'Kakinada', state: 'Andhra Pradesh', pincode: '533001' },

  // Madhya Pradesh
  { city: 'Indore', district: 'Indore', state: 'Madhya Pradesh', pincode: '452001', isPopular: true },
  { city: 'Bhopal', district: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', isPopular: true },
  { city: 'Jabalpur', district: 'Jabalpur', state: 'Madhya Pradesh', pincode: '482001' },
  { city: 'Gwalior', district: 'Gwalior', state: 'Madhya Pradesh', pincode: '474001', isPopular: true },
  { city: 'Ujjain', district: 'Ujjain', state: 'Madhya Pradesh', pincode: '456001' },
  { city: 'Sagar', district: 'Sagar', state: 'Madhya Pradesh', pincode: '470001' },

  // Haryana
  { city: 'Gurugram', district: 'Gurugram', state: 'Haryana', pincode: '122001', isPopular: true },
  { city: 'Faridabad', district: 'Faridabad', state: 'Haryana', pincode: '121001', isPopular: true },
  { city: 'Panipat', district: 'Panipat', state: 'Haryana', pincode: '132103' },
  { city: 'Ambala', district: 'Ambala', state: 'Haryana', pincode: '134003' },
  { city: 'Karnal', district: 'Karnal', state: 'Haryana', pincode: '132001' },
  { city: 'Hisar', district: 'Hisar', state: 'Haryana', pincode: '125001' },
  { city: 'Rohtak', district: 'Rohtak', state: 'Haryana', pincode: '124001' },
  { city: 'Panchkula', district: 'Panchkula', state: 'Haryana', pincode: '134109' },

  // Punjab
  { city: 'Ludhiana', district: 'Ludhiana', state: 'Punjab', pincode: '141001', isPopular: true },
  { city: 'Amritsar', district: 'Amritsar', state: 'Punjab', pincode: '143001', isPopular: true },
  { city: 'Jalandhar', district: 'Jalandhar', state: 'Punjab', pincode: '144001', isPopular: true },
  { city: 'Patiala', district: 'Patiala', state: 'Punjab', pincode: '147001' },
  { city: 'Bathinda', district: 'Bathinda', state: 'Punjab', pincode: '151001' },
  { city: 'Mohali', district: 'SAS Nagar', state: 'Punjab', pincode: '160055' },

  // Bihar
  { city: 'Patna', district: 'Patna', state: 'Bihar', pincode: '800001', isPopular: true },
  { city: 'Gaya', district: 'Gaya', state: 'Bihar', pincode: '823001' },
  { city: 'Bhagalpur', district: 'Bhagalpur', state: 'Bihar', pincode: '812001' },
  { city: 'Muzaffarpur', district: 'Muzaffarpur', state: 'Bihar', pincode: '842001' },
  { city: 'Darbhanga', district: 'Darbhanga', state: 'Bihar', pincode: '846004' },
  { city: 'Purnia', district: 'Purnia', state: 'Bihar', pincode: '854301' },

  // Odisha
  { city: 'Bhubaneswar', district: 'Khordha', state: 'Odisha', pincode: '751001', isPopular: true },
  { city: 'Cuttack', district: 'Cuttack', state: 'Odisha', pincode: '753001' },
  { city: 'Rourkela', district: 'Sundargarh', state: 'Odisha', pincode: '769001' },
  { city: 'Puri', district: 'Puri', state: 'Odisha', pincode: '752001' },
  { city: 'Berhampur', district: 'Ganjam', state: 'Odisha', pincode: '760001' },

  // Jharkhand
  { city: 'Ranchi', district: 'Ranchi', state: 'Jharkhand', pincode: '834001', isPopular: true },
  { city: 'Jamshedpur', district: 'East Singhbhum', state: 'Jharkhand', pincode: '831001', isPopular: true },
  { city: 'Dhanbad', district: 'Dhanbad', state: 'Jharkhand', pincode: '826001' },
  { city: 'Bokaro Steel City', district: 'Bokaro', state: 'Jharkhand', pincode: '827001' },

  // Chhattisgarh
  { city: 'Raipur', district: 'Raipur', state: 'Chhattisgarh', pincode: '492001', isPopular: true },
  { city: 'Bhilai', district: 'Durg', state: 'Chhattisgarh', pincode: '490006' },
  { city: 'Bilaspur', district: 'Bilaspur', state: 'Chhattisgarh', pincode: '495001' },

  // Assam
  { city: 'Guwahati', district: 'Kamrup Metropolitan', state: 'Assam', pincode: '781001', isPopular: true },
  { city: 'Silchar', district: 'Cachar', state: 'Assam', pincode: '788001' },
  { city: 'Dibrugarh', district: 'Dibrugarh', state: 'Assam', pincode: '786001' },
  { city: 'Jorhat', district: 'Jorhat', state: 'Assam', pincode: '785001' },

  // Uttarakhand
  { city: 'Dehradun', district: 'Dehradun', state: 'Uttarakhand', pincode: '248001', isPopular: true },
  { city: 'Haridwar', district: 'Haridwar', state: 'Uttarakhand', pincode: '249401' },
  { city: 'Roorkee', district: 'Haridwar', state: 'Uttarakhand', pincode: '247667' },
  { city: 'Haldwani', district: 'Nainital', state: 'Uttarakhand', pincode: '263139' },
  { city: 'Rishikesh', district: 'Dehradun', state: 'Uttarakhand', pincode: '249201' },

  // Himachal Pradesh
  { city: 'Shimla', district: 'Shimla', state: 'Himachal Pradesh', pincode: '171001', isPopular: true },
  { city: 'Dharamshala', district: 'Kangra', state: 'Himachal Pradesh', pincode: '176215' },
  { city: 'Solan', district: 'Solan', state: 'Himachal Pradesh', pincode: '173212' },
  { city: 'Mandi', district: 'Mandi', state: 'Himachal Pradesh', pincode: '175001' },
  { city: 'Manali', district: 'Kullu', state: 'Himachal Pradesh', pincode: '175131' },

  // Goa
  { city: 'Panaji', district: 'North Goa', state: 'Goa', pincode: '403001', isPopular: true },
  { city: 'Margao', district: 'South Goa', state: 'Goa', pincode: '403601' },
  { city: 'Vasco da Gama', district: 'South Goa', state: 'Goa', pincode: '403802' },
  { city: 'Mapusa', district: 'North Goa', state: 'Goa', pincode: '403507' },

  // Jammu & Kashmir
  { city: 'Srinagar', district: 'Srinagar', state: 'Jammu and Kashmir', pincode: '190001', isPopular: true },
  { city: 'Jammu', district: 'Jammu', state: 'Jammu and Kashmir', pincode: '180001', isPopular: true },
  { city: 'Anantnag', district: 'Anantnag', state: 'Jammu and Kashmir', pincode: '192101' },

  // Chandigarh (UT)
  { city: 'Chandigarh', district: 'Chandigarh', state: 'Chandigarh', pincode: '160001', isPopular: true },

  // Puducherry (UT)
  { city: 'Pondicherry', district: 'Pondicherry', state: 'Puducherry', pincode: '605001', isPopular: true },

  // Tripura
  { city: 'Agartala', district: 'West Tripura', state: 'Tripura', pincode: '799001', isPopular: true },

  // Meghalaya
  { city: 'Shillong', district: 'East Khasi Hills', state: 'Meghalaya', pincode: '793001', isPopular: true },

  // Manipur
  { city: 'Imphal', district: 'Imphal West', state: 'Manipur', pincode: '795001', isPopular: true },

  // Nagaland
  { city: 'Kohima', district: 'Kohima', state: 'Nagaland', pincode: '797001', isPopular: true },
  { city: 'Dimapur', district: 'Dimapur', state: 'Nagaland', pincode: '797112' },

  // Mizoram
  { city: 'Aizawl', district: 'Aizawl', state: 'Mizoram', pincode: '796001', isPopular: true },

  // Sikkim
  { city: 'Gangtok', district: 'East Sikkim', state: 'Sikkim', pincode: '737101', isPopular: true },

  // Arunachal Pradesh
  { city: 'Itanagar', district: 'Papum Pare', state: 'Arunachal Pradesh', pincode: '791111', isPopular: true },

  // Ladakh (UT)
  { city: 'Leh', district: 'Leh', state: 'Ladakh', pincode: '194101', isPopular: true },

  // Andaman & Nicobar (UT)
  { city: 'Port Blair', district: 'South Andaman', state: 'Andaman and Nicobar Islands', pincode: '744101', isPopular: true },
];

export async function seedGeoDataIfNeeded() {
  try {
    const stateCount = await IndiaStateModel.countDocuments();
    if (stateCount === 0) {
      console.log('[GeoSeeder] Seeding all 28 States and 8 Union Territories...');
      await IndiaStateModel.insertMany(ALL_INDIA_STATES);
      console.log(`[GeoSeeder] Successfully seeded ${ALL_INDIA_STATES.length} States and UTs.`);
    }

    const locationCount = await IndiaLocationModel.countDocuments();
    if (locationCount === 0) {
      console.log('[GeoSeeder] Seeding initial database of Indian cities & pincodes...');
      await IndiaLocationModel.insertMany(INITIAL_CITIES_AND_PINCODES);
      console.log(`[GeoSeeder] Successfully seeded ${INITIAL_CITIES_AND_PINCODES.length} cities & pincodes.`);
    }
  } catch (err) {
    console.error('[GeoSeeder] Error checking or seeding India Geo data:', err);
  }
}
