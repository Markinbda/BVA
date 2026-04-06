-- Add unique constraint so we can use ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS page_content_slug_key_idx
  ON public.page_content (page_slug, section_key);

-- ============================================================
-- HOME
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('home', 'hero_title',           'text', 'Welcome to the Bermuda Volleyball Association', null),
('home', 'hero_subtitle',        'text', 'Promoting volleyball in Bermuda for over 50 years', null),
('home', 'hero_image',           'image', null, ''),
('home', 'latest_news_heading',  'text', 'Latest News', null),
('home', 'events_heading',       'text', 'Upcoming Events', null),
('home', 'sponsors_heading',     'text', 'Our Sponsors', null),
('home', 'sponsors_subtext',     'text', 'Thank you to our sponsors for supporting volleyball in Bermuda.', null),
('home', 'cta_title',            'text', 'Join the BVA', null),
('home', 'cta_text',             'text', 'Membership starts free for youth players.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- ABOUT
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('about', 'page_title',             'text', 'About Us', null),
('about', 'page_subtitle',          'text', 'Promoting volleyball in Bermuda for over 50 years', null),
('about', 'header_image',           'image', null, ''),
('about', 'history_heading',        'text', 'Our History', null),
('about', 'history_text',           'text', 'The Bermuda Volleyball Association has been established for more than 50 years. We are the official Sports Governing Body for Volleyball in Bermuda. We are part of the ECVA, NORCECA and FIVB. We offer recreational indoor & beach leagues and tournaments, referee and coaching courses, youth development programs and manage the national team program for juniors and seniors. We are a volunteer based charity (#646) whose mission is to grow the sport of Volleyball in Bermuda.', null),
('about', 'history_image',          'image', null, ''),
('about', 'affiliations_heading',   'text', 'Affiliations', null),
('about', 'ecva_name',              'text', 'ECVA', null),
('about', 'ecva_full',              'text', 'Eastern Caribbean Volleyball Association', null),
('about', 'ecva_desc',              'text', 'Regional governing body for volleyball in the Eastern Caribbean', null),
('about', 'norceca_name',           'text', 'NORCECA', null),
('about', 'norceca_full',           'text', 'North, Central America and Caribbean Volleyball Confederation', null),
('about', 'norceca_desc',           'text', 'Continental confederation overseeing volleyball in North and Central America and the Caribbean', null),
('about', 'fivb_name',              'text', 'FIVB', null),
('about', 'fivb_full',              'text', 'Fédération Internationale de Volleyball', null),
('about', 'fivb_desc',              'text', 'International governing body for all forms of volleyball worldwide', null),
('about', 'what_we_offer_heading',  'text', 'What We Offer', null),
('about', 'contact_heading',        'text', 'Get in Touch', null),
('about', 'contact_email',          'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- ABOUT / MISSION
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('about_mission', 'page_title',        'text', 'Mission', null),
('about_mission', 'page_subtitle',     'text', 'Our purpose and guiding principles', null),
('about_mission', 'mission_heading',   'text', 'BVA Mission Statement', null),
('about_mission', 'mission_intro',     'text', 'The Bermuda Volleyball Association is a volunteer-based charity (#646) and the sole authority governing the sport of volleyball in Bermuda. Our mission is guided by the following core objectives:', null),
('about_mission', 'objective_a',       'text', 'To represent, promote and develop the sport of volleyball in Bermuda.', null),
('about_mission', 'objective_b',       'text', 'To seek support from and work cooperatively with organizations, agencies, groups and individuals sharing consistent objectives.', null),
('about_mission', 'objective_c',       'text', 'To conduct local, regional and national competitions and events in the sport of volleyball.', null),
('about_mission', 'objective_d',       'text', 'To develop athletes, teams, coaches and officials to represent Bermuda at international competitions.', null),
('about_mission', 'objective_e',       'text', 'To affiliate with and represent Bermuda to the international body governing the sport of volleyball while upholding its rules.', null),
('about_mission', 'objective_f',       'text', 'To act as the sole authority governing the sport volleyball in Bermuda by making, maintaining and enforcing rules.', null),
('about_mission', 'objective_g',       'text', 'To raise, use, invest and reinvest funds to support these objectives.', null),
('about_mission', 'contact_email',     'text', 'bdavb@hotmail.com', null),
('about_mission', 'office_address',    'text', 'Rosebank Building, 11 Bermudiana Road, Pembroke HM08', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- ABOUT / EXECUTIVES
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('about_executives', 'page_title',    'text', 'Executives', null),
('about_executives', 'page_subtitle', 'text', 'Meet the BVA leadership team', null),
('about_executives', 'intro_text',    'text', 'The BVA is led by a volunteer executive committee elected by its members.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- ABOUT / GOVERNING BODIES
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('about_governing_bodies', 'page_title',    'text', 'Governing Bodies', null),
('about_governing_bodies', 'page_subtitle', 'text', 'International affiliations and governing organizations', null),
('about_governing_bodies', 'intro_text',    'text', 'The BVA is affiliated with regional and international volleyball governing bodies.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- ABOUT / ANNUAL REPORTS
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('about_annual_reports', 'page_title',    'text', 'Annual Reports', null),
('about_annual_reports', 'page_subtitle', 'text', 'BVA yearly summaries and financial reports', null),
('about_annual_reports', 'intro_text',    'text', 'Annual reports are made available to BVA members.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- ABOUT / ANTI-DOPING
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('about_anti_doping', 'page_title',    'text', 'Anti-Doping', null),
('about_anti_doping', 'page_subtitle', 'text', 'BVA commitment to clean sport', null),
('about_anti_doping', 'intro_text',    'text', 'The BVA is committed to clean sport and follows FIVB and WADA anti-doping regulations.', null),
('about_anti_doping', 'policy_text',   'text', 'All national team athletes are subject to anti-doping testing in accordance with international standards.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs', 'page_title',              'text', 'Programs', null),
('programs', 'page_subtitle',           'text', 'Youth development, national teams, and beach volleyball', null),
('programs', 'junior_title',            'text', 'Junior Program', null),
('programs', 'junior_subtitle',         'text', 'Paradise Hitters & Big Wave Riders', null),
('programs', 'junior_description',      'text', 'Competitive volleyball programs for boys and girls ages 12-18. Year-round training in indoor and beach volleyball with opportunities to represent Bermuda.', null),
('programs', 'junior_image',            'image', null, ''),
('programs', 'senior_title',            'text', 'Senior National Teams', null),
('programs', 'senior_subtitle',         'text', 'Men''s & Women''s Teams', null),
('programs', 'senior_description',      'text', 'Bermuda''s Men''s and Women''s National Volleyball Teams competing in ECVA, NORCECA, Island Games, and US Open Championships.', null),
('programs', 'senior_image',            'image', null, ''),
('programs', 'beach_title',             'text', 'Beach Volleyball', null),
('programs', 'beach_subtitle',          'text', 'National Beach Program', null),
('programs', 'beach_description',       'text', 'BVA''s national beach volleyball program develops athletes for international beach volleyball competition on Bermuda''s beautiful beaches.', null),
('programs', 'beach_image',             'image', null, ''),
('programs', 'youth_camps_title',       'text', 'Youth Camps', null),
('programs', 'youth_camps_subtitle',    'text', 'March Break & Summer Camps', null),
('programs', 'youth_camps_description', 'text', 'Week-long volleyball camps for young athletes during school breaks. Fun, skills development, and team building at CedarBridge Academy.', null),
('programs', 'youth_camps_image',       'image', null, ''),
('programs', 'contact_text',            'text', 'Contact us at bermudavolleyball@gmail.com for more information.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / JUNIOR
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_junior', 'page_title',                  'text', 'Junior Program', null),
('programs_junior', 'page_subtitle',               'text', 'Developing Bermuda''s next generation of volleyball players', null),
('programs_junior', 'hero_image',                  'image', null, ''),
('programs_junior', 'intro_text',                  'text', 'The Junior Volleyball Program was created by the BVA to help provide opportunities for young players, with a passion for volleyball, to develop their volleyball skills and help them play volleyball at higher levels once they graduate from high school.', null),
('programs_junior', 'intro_text_2',                'text', 'Indoor volleyball training programs generally run from September through April/May of each year, and beach volleyball training programs generally run from March through October (weather dependent).', null),
('programs_junior', 'paradise_hitters_title',      'text', 'Paradise Hitters', null),
('programs_junior', 'paradise_hitters_subtitle',   'text', 'Girls'' Volleyball Club', null),
('programs_junior', 'paradise_hitters_desc',       'text', 'The Paradise Hitters is BVA''s competitive girls'' volleyball program for ages 12-18. The program focuses on skill development, teamwork, sportsmanship, and competitive play in both indoor and beach volleyball.', null),
('programs_junior', 'paradise_hitters_ages',       'text', '12-18', null),
('programs_junior', 'paradise_hitters_fee',        'text', '$1,000/season (3 installments available)', null),
('programs_junior', 'paradise_hitters_season',     'text', 'Year-round training with seasonal competitions', null),
('programs_junior', 'big_wave_riders_title',       'text', 'Big Wave Riders', null),
('programs_junior', 'big_wave_riders_subtitle',    'text', 'Boys'' Volleyball Club', null),
('programs_junior', 'big_wave_riders_desc',        'text', 'The Big Wave Riders program develops young male volleyball players ages 12-18 through structured training and competitive play. Players learn fundamental skills and advanced techniques in both indoor and beach volleyball.', null),
('programs_junior', 'big_wave_riders_ages',        'text', '12-18', null),
('programs_junior', 'big_wave_riders_fee',         'text', '$1,000/season (3 installments available)', null),
('programs_junior', 'big_wave_riders_season',      'text', 'Year-round training with seasonal competitions', null),
('programs_junior', 'financial_aid_title',         'text', 'Need Financial Assistance?', null),
('programs_junior', 'financial_aid_text',          'text', 'BVA offers bursaries and financial aid to ensure all athletes can participate regardless of financial circumstances. Partial scholarships of $500 are available.', null),
('programs_junior', 'contact_email',               'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / JUNIOR GIRLS (PARADISE HITTERS)
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_junior_girls', 'page_title',    'text', 'Paradise Hitters', null),
('programs_junior_girls', 'page_subtitle', 'text', 'Girls'' competitive volleyball club — ages 12 to 18', null),
('programs_junior_girls', 'hero_image',    'image', null, ''),
('programs_junior_girls', 'intro_text',    'text', 'The Paradise Hitters is BVA''s competitive girls'' volleyball program for ages 12-18. The program focuses on skill development, teamwork, sportsmanship, and competitive play.', null),
('programs_junior_girls', 'ages',          'text', '12-18', null),
('programs_junior_girls', 'fee',           'text', '$1,000/season (3 installments available)', null),
('programs_junior_girls', 'season',        'text', 'Year-round training with seasonal competitions', null),
('programs_junior_girls', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / JUNIOR BOYS (BIG WAVE RIDERS)
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_junior_boys', 'page_title',    'text', 'Big Wave Riders', null),
('programs_junior_boys', 'page_subtitle', 'text', 'Boys'' competitive volleyball club — ages 12 to 18', null),
('programs_junior_boys', 'hero_image',    'image', null, ''),
('programs_junior_boys', 'intro_text',    'text', 'The Big Wave Riders program develops young male volleyball players ages 12-18 through structured training and competitive play.', null),
('programs_junior_boys', 'ages',          'text', '12-18', null),
('programs_junior_boys', 'fee',           'text', '$1,000/season (3 installments available)', null),
('programs_junior_boys', 'season',        'text', 'Year-round training with seasonal competitions', null),
('programs_junior_boys', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / SENIOR NATIONAL TEAMS
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_senior', 'page_title',              'text', 'Senior National Teams', null),
('programs_senior', 'page_subtitle',           'text', 'Representing Bermuda on the international stage', null),
('programs_senior', 'hero_image',              'image', null, ''),
('programs_senior', 'intro_text',              'text', 'The National Team program began in 2002 with the objective of building a tradition of instructional and highly competitive volleyball in Bermuda through excellence in coaching, well-run and well-administered programs, a philosophy of inclusiveness and dedication to each team member.', null),
('programs_senior', 'history_heading',         'text', 'Program History', null),
('programs_senior', 'history_text_1',          'text', 'Since 2002, the growth and success of the indoor NT program has led to Bermuda competing in the NatWest Island Games, international tournaments such as the Boston Bean Pot and the U.S. Open, and the FIVB World Championship Qualification.', null),
('programs_senior', 'history_text_2',          'text', 'The Senior National Teams were created in 2002 in preparation for Bermuda''s first participation in the NatWest Island Games in Guernsey (2003). Since then, Bermuda''s Senior Teams have participated in the Island Games in Shetland (2005), Rhodes (2007), Åland (2009), Isle of Wight (2011), Bermuda (2013), Jersey (2015) and Gotland (2017).', null),
('programs_senior', 'mens_title',              'text', 'Men''s National Team', null),
('programs_senior', 'mens_description',        'text', 'Bermuda''s Men''s National Volleyball Team competes in ECVA and NORCECA championships. The team trains year-round with peak season during championship events. Players must maintain BVA membership and participate in local league play.', null),
('programs_senior', 'womens_title',            'text', 'Women''s National Team', null),
('programs_senior', 'womens_description',      'text', 'Bermuda''s Women''s National Volleyball Team competes in ECVA and NORCECA championships, representing the island at the highest level. The team has achieved notable results including a silver medal at the Nike International Festival.', null),
('programs_senior', 'expectations_commitment', 'text', 'Year-round training attendance, with peak during championship season', null),
('programs_senior', 'expectations_league',     'text', 'Must participate in BVA local league play during indoor and/or beach seasons', null),
('programs_senior', 'expectations_fundraising','text', 'Players participate in fundraising efforts to support team travel and equipment', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / MEN'S NATIONAL TEAM
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_senior_mens', 'page_title',    'text', 'Men''s National Team', null),
('programs_senior_mens', 'page_subtitle', 'text', 'Bermuda''s elite men competing on the world stage', null),
('programs_senior_mens', 'hero_image',    'image', null, ''),
('programs_senior_mens', 'intro_text',    'text', 'Bermuda''s Men''s National Volleyball Team competes in ECVA and NORCECA championships. The team trains year-round with peak season during championship events.', null),
('programs_senior_mens', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / WOMEN'S NATIONAL TEAM
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_senior_womens', 'page_title',    'text', 'Women''s National Team', null),
('programs_senior_womens', 'page_subtitle', 'text', 'Pride, passion and power — Bermuda''s women''s volleyball', null),
('programs_senior_womens', 'hero_image',    'image', null, ''),
('programs_senior_womens', 'intro_text',    'text', 'Bermuda''s Women''s National Volleyball Team competes in ECVA and NORCECA championships. The team has achieved notable results including a silver medal at the Nike International Festival.', null),
('programs_senior_womens', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / YOUTH CAMPS
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_youth_camps', 'page_title',            'text', 'Indoor Youth Camps', null),
('programs_youth_camps', 'page_subtitle',          'text', 'Fun, skills, and volleyball for young athletes', null),
('programs_youth_camps', 'hero_image',             'image', null, ''),
('programs_youth_camps', 'camp_heading',           'text', '2025 March Break Volleyball Camp', null),
('programs_youth_camps', 'camp_intro',             'text', 'The Bermuda Volleyball Association wants you and your friends to participate in our March Break Volleyball Camps. It''ll be super easy for you to have fun, learn new skills and then show them off in the awesome game of volleyball.', null),
('programs_youth_camps', 'week1_label',            'text', 'Week 1', null),
('programs_youth_camps', 'week1_dates',            'text', 'March 24th to March 28th', null),
('programs_youth_camps', 'week2_label',            'text', 'Week 2', null),
('programs_youth_camps', 'week2_dates',            'text', 'March 31st to April 4th', null),
('programs_youth_camps', 'camp_dates_detail',      'text', 'Week 1: Mar 24–28 | Week 2: Mar 31–Apr 4', null),
('programs_youth_camps', 'camp_cost',              'text', '$300 per week', null),
('programs_youth_camps', 'registration_deadline',  'text', 'Registration closes Monday, February 3rd', null),
('programs_youth_camps', 'camp_location',          'text', 'Warwick Academy Gymnasium', null),
('programs_youth_camps', 'camp_ages',              'text', 'Ages: 8–14', null),
('programs_youth_camps', 'contact_email',          'text', 'bdavb@hotmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / COACHING
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_coaching', 'page_title',    'text', 'Coaching Program', null),
('programs_coaching', 'page_subtitle', 'text', 'Develop your coaching skills with BVA certification courses', null),
('programs_coaching', 'intro_text',    'text', 'The BVA runs coaching certification courses for players looking to develop as coaches. Courses are aligned with NORCECA and FIVB coaching standards.', null),
('programs_coaching', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- PROGRAMS / REFEREE
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('programs_referee', 'page_title',    'text', 'Referee Program', null),
('programs_referee', 'page_subtitle', 'text', 'Become a certified BVA referee', null),
('programs_referee', 'intro_text',    'text', 'The BVA Referee Program certifies officials to referee beach and indoor volleyball at local, regional, and international levels.', null),
('programs_referee', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues', 'page_title',                 'text', 'Leagues & Tournaments', null),
('leagues', 'page_subtitle',              'text', 'Competitive volleyball for all levels', null),
('leagues', 'summer_beach_title',         'text', 'Summer Beach Leagues', null),
('leagues', 'summer_beach_description',   'text', 'BVA runs beach volleyball leagues Monday through Thursday at Horseshoe Bay Beach and Elbow Beach from May to September. Formats include 2v2 and 4v4, with recreational and competitive divisions.', null),
('leagues', 'summer_beach_season',        'text', 'May – September', null),
('leagues', 'summer_beach_format',        'text', '2v2 and 4v4', null),
('leagues', 'summer_beach_fee',           'text', '$225-450/team', null),
('leagues', 'summer_beach_locations',     'text', 'Horseshoe Bay & Elbow Beach', null),
('leagues', 'summer_beach_image',         'image', null, ''),
('leagues', 'winter_indoor_title',        'text', 'Winter Indoor League', null),
('leagues', 'winter_indoor_description',  'text', 'Indoor volleyball leagues run from November through February at CedarBridge Academy gymnasium. Divisions include competitive and recreational 6v6 play.', null),
('leagues', 'winter_indoor_season',       'text', 'November – February', null),
('leagues', 'winter_indoor_format',       'text', '6v6', null),
('leagues', 'winter_indoor_fee',          'text', '$150/team', null),
('leagues', 'winter_indoor_location',     'text', 'CedarBridge Academy Gym', null),
('leagues', 'grass_title',                'text', 'Grass Leagues', null),
('leagues', 'grass_description',          'text', 'Grass volleyball events held at various outdoor venues across Bermuda during spring and fall seasons.', null),
('leagues', 'grass_season',               'text', 'Spring & Fall', null),
('leagues', 'grass_format',               'text', '4v4 and 6v6', null),
('leagues', 'grass_fee',                  'text', '$75/team', null),
('leagues', 'grass_location',             'text', 'Various', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / WINTER
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_winter', 'page_title',          'text', 'Winter League', null),
('leagues_winter', 'page_subtitle',       'text', '2025–26 Indoor 6v6 — Women''s, Men''s & Coed', null),
('leagues_winter', 'intro_text',          'text', '6-a-side indoor volleyball leagues with Women''s, Men''s, and Coed divisions. Teams register together and are placed using a ladder system — teams move up or down weekly based on win/loss records. Individual registration is also available, though placement is not guaranteed.', null),
('leagues_winter', 'divisions_heading',   'text', 'Divisions', null),
('leagues_winter', 'womens_division',     'text', 'Competitive and recreational women''s 6v6 indoor league', null),
('leagues_winter', 'mens_division',       'text', 'Competitive and recreational men''s 6v6 indoor league', null),
('leagues_winter', 'coed_division',       'text', 'Mixed teams with standard coed rules, all skill levels', null),
('leagues_winter', 'registration_opens',  'text', 'October 14 at 12:00 AM (first-come, first-served)', null),
('leagues_winter', 'roster_deadline',     'text', 'October 20', null),
('leagues_winter', 'registration_closes', 'text', 'October 24', null),
('leagues_winter', 'season_dates',        'text', 'November – February', null),
('leagues_winter', 'requirements_text',   'text', 'All participants must maintain an active BVA membership. Teams must wear matching uniforms with front and back numbers by Week 3.', null),
('leagues_winter', 'contact_email',       'text', 'bdavb@hotmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / SPRING
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_spring', 'page_title',         'text', 'Spring League', null),
('leagues_spring', 'page_subtitle',      'text', 'Outdoor grass volleyball — spring season', null),
('leagues_spring', 'intro_text',         'text', 'The BVA Spring League runs outdoors on grass at various venues across Bermuda. Teams of all levels are welcome.', null),
('leagues_spring', 'season_dates',       'text', 'Spring season dates to be announced', null),
('leagues_spring', 'format',             'text', '4v4 and 6v6', null),
('leagues_spring', 'fee',                'text', '$75/team', null),
('leagues_spring', 'contact_email',      'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / BEACH TOURNAMENTS
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_beach_tournaments', 'page_title',    'text', 'Beach Tournaments', null),
('leagues_beach_tournaments', 'page_subtitle', 'text', 'Competitive beach volleyball events in Bermuda', null),
('leagues_beach_tournaments', 'intro_text',    'text', 'BVA hosts a series of beach volleyball tournaments throughout the year at Horseshoe Bay and other beach locations across Bermuda.', null),
('leagues_beach_tournaments', 'hero_image',    'image', null, ''),
('leagues_beach_tournaments', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / BERMUDA OPEN
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_bermuda_open', 'page_title',    'text', 'Bermuda Open', null),
('leagues_bermuda_open', 'page_subtitle', 'text', 'International volleyball tournament hosted in Bermuda', null),
('leagues_bermuda_open', 'intro_text',    'text', 'The Bermuda Open is BVA''s flagship international tournament featuring teams from Canada, the United States, and the Caribbean.', null),
('leagues_bermuda_open', 'date',          'text', 'August 2025', null),
('leagues_bermuda_open', 'format',        'text', '4v4 Beach', null),
('leagues_bermuda_open', 'location',      'text', 'Horseshoe Bay', null),
('leagues_bermuda_open', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / CORPORATE TOURNAMENT
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_corporate', 'page_title',    'text', 'Corporate Tournament', null),
('leagues_corporate', 'page_subtitle', 'text', 'Annual BVA corporate volleyball tournament', null),
('leagues_corporate', 'intro_text',    'text', 'The BVA Annual Corporate Tournament brings together companies and organisations across Bermuda for a fun day of competitive volleyball.', null),
('leagues_corporate', 'date',          'text', 'April 2026', null),
('leagues_corporate', 'format',        'text', 'Coed', null),
('leagues_corporate', 'location',      'text', 'TBD', null),
('leagues_corporate', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / NATWEST ISLAND GAMES
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_island_games', 'page_title',    'text', 'NatWest Island Games', null),
('leagues_island_games', 'page_subtitle', 'text', 'Bermuda''s participation in the international island games', null),
('leagues_island_games', 'intro_text',    'text', 'Bermuda has competed in the NatWest Island Games since 2003. The games bring together island nations from around the world for multi-sport competition.', null),
('leagues_island_games', 'history_text',  'text', 'Bermuda has participated in the Island Games in Guernsey (2003), Shetland (2005), Rhodes (2007), Åland (2009), Isle of Wight (2011), Bermuda (2013), Jersey (2015) and Gotland (2017).', null),
('leagues_island_games', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- LEAGUES / RULES
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('leagues_rules', 'page_title',          'text', 'BVA League Rules', null),
('leagues_rules', 'page_subtitle',       'text', 'Official rules and regulations for all BVA leagues', null),
('leagues_rules', 'general_rules_text',  'text', 'All BVA league participants are required to maintain a current BVA membership and abide by FIVB rules as adapted for local league play.', null),
('leagues_rules', 'uniform_rules_text',  'text', 'Teams must wear matching uniforms with front and back numbers by Week 3. Point deductions apply for non-compliance after this deadline.', null),
('leagues_rules', 'membership_text',     'text', 'Active BVA membership is required for all league participants.', null),
('leagues_rules', 'contact_email',       'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- REGISTRATION
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('registration', 'page_title',               'text', 'Registration', null),
('registration', 'page_subtitle',            'text', 'Sign up for BVA leagues, tournaments, and programs', null),
('registration', 'summer_beach_title',       'text', 'Summer Beach Leagues', null),
('registration', 'summer_beach_desc',        'text', 'Register your team for the BVA Summer Beach Volleyball League. Multiple nights and formats available at Horseshoe Bay and Elbow Beach.', null),
('registration', 'summer_beach_period',      'text', 'Registration opens April each year', null),
('registration', 'summer_beach_fee',         'text', '$100-200/team', null),
('registration', 'indoor_title',             'text', 'Indoor Leagues', null),
('registration', 'indoor_desc',              'text', 'Register for the BVA Indoor Volleyball League at CedarBridge Academy. Competitive and recreational divisions.', null),
('registration', 'indoor_period',            'text', 'Registration opens September', null),
('registration', 'indoor_fee',               'text', '$150/team or $25/individual', null),
('registration', 'junior_girls_title',       'text', 'Paradise Hitters (Girls'' Junior)', null),
('registration', 'junior_girls_desc',        'text', 'Competitive girls'' volleyball program for ages 12-18. Year-round training in indoor and beach volleyball.', null),
('registration', 'junior_girls_period',      'text', 'Year-round with seasonal tryouts', null),
('registration', 'junior_girls_fee',         'text', '$1,000/season (3 installments)', null),
('registration', 'junior_boys_title',        'text', 'Big Wave Riders (Boys'' Junior)', null),
('registration', 'junior_boys_desc',         'text', 'Competitive boys'' volleyball program for ages 12-18. Structured training and competitive play.', null),
('registration', 'junior_boys_period',       'text', 'Year-round with seasonal tryouts', null),
('registration', 'junior_boys_fee',          'text', '$1,000/season (3 installments)', null),
('registration', 'youth_camps_title',        'text', 'Youth Camps', null),
('registration', 'youth_camps_desc',         'text', 'March Break volleyball camps for young athletes. A week of fun, skills, and volleyball at CedarBridge Academy.', null),
('registration', 'youth_camps_period',       'text', 'March school break', null),
('registration', 'youth_camps_fee',          'text', '$300/camp', null),
('registration', 'national_team_title',      'text', 'National Team Tryouts', null),
('registration', 'national_team_desc',       'text', 'Men''s and Women''s National Team tryouts for ECVA, NORCECA, Island Games, and US Open competitions.', null),
('registration', 'national_team_period',     'text', 'Announced annually', null),
('registration', 'national_team_requirement','text', 'Active BVA membership required', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- REGISTRATION / WINTER LEAGUE
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('registration_winter', 'page_title',    'text', 'Winter League Registration', null),
('registration_winter', 'page_subtitle', 'text', 'Register your team for the BVA Indoor League', null),
('registration_winter', 'intro_text',    'text', 'Register your team for the BVA Winter Indoor League. Teams and individuals are welcome. Registration is first-come, first-served.', null),
('registration_winter', 'fee',           'text', '$150/team or $25/individual', null),
('registration_winter', 'contact_email', 'text', 'bdavb@hotmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- REGISTRATION / BEACH
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('registration_beach', 'page_title',    'text', 'Beach Registration', null),
('registration_beach', 'page_subtitle', 'text', 'Register for BVA beach volleyball leagues and tournaments', null),
('registration_beach', 'intro_text',    'text', 'Register your team for BVA beach volleyball. Multiple nights and formats available.', null),
('registration_beach', 'fee',           'text', '$225-450/team depending on format', null),
('registration_beach', 'contact_email', 'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- BURSARY / FINANCIAL AID
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('bursary', 'page_title',             'text', 'Financial Aid', null),
('bursary', 'page_subtitle',          'text', 'Providing opportunities for all athletes', null),
('bursary', 'mission_heading',        'text', 'Our Mission', null),
('bursary', 'mission_text',           'text', 'Provide an opportunity for any athlete that participates in the Bermuda Volleyball Association''s programs, to compete at a high level and promote his/her potential, regardless of financial circumstances.', null),
('bursary', 'how_it_works_text',      'text', 'The Bermuda Volleyball Association makes every attempt to provide those in need with some financial support. The BVA''s Financial Aid Committee distributes aid to as many families as possible. In so doing, the BVA finds it necessary to generally provide only partial award amounts toward the total program fees. Only in rare circumstances is the BVA able to offer full support.', null),
('bursary', 'scholarship_text',       'text', 'Partial scholarships are available to all players. Generally speaking, under a partial scholarship the athlete will be awarded all or part of the 1st term program fee of $500. The athlete will then be responsible for paying subsequent training fees and travel fees if applicable. There are limited partial scholarships.', null),
('bursary', 'application_heading',    'text', 'Application / Request Process', null),
('bursary', 'application_text',       'text', 'Financial Aid requests are reviewed and awards are made by a committee independent of those involved with decision making on player evaluations and fielding teams.', null),
('bursary', 'application_deadline',   'text', 'All applications for the 2025-26 Season are due by December 12th, 2025.', null),
('bursary', 'form_title',             'text', '2025-26 Financial Aid Request Form', null),
('bursary', 'contact_email_bursary',  'text', 'bvabursary@hotmail.com', null),
('bursary', 'contact_email_alt',      'text', 'bdavb@hotmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- BURSARY / ADOPT-AN-ATHLETE
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('bursary_adopt_athlete', 'page_title',            'text', 'Adopt-an-Athlete', null),
('bursary_adopt_athlete', 'page_subtitle',         'text', 'Help our national team athletes pursue excellence', null),
('bursary_adopt_athlete', 'program_description',   'text', 'BVA national team athletes give their time and energy while contributing significantly to the BVA. They often balance school or work with training and competition. The Adopt-an-Athlete program enables athletes to pursue excellence in sport and leadership that might otherwise be financially unattainable.', null),
('bursary_adopt_athlete', 'donation_tier_50',      'text', 'Helps cover a training session', null),
('bursary_adopt_athlete', 'donation_tier_100',     'text', 'Supports weekly training costs', null),
('bursary_adopt_athlete', 'donation_tier_250',     'text', 'Contributes to tournament travel', null),
('bursary_adopt_athlete', 'donation_tier_500',     'text', 'Funds a full competition trip', null),
('bursary_adopt_athlete', 'cta_title',             'text', 'Ready to Support an Athlete?', null),
('bursary_adopt_athlete', 'cta_text',              'text', 'Get in touch and we''ll get you set up.', null),
('bursary_adopt_athlete', 'contact_email',         'text', 'bdavb@hotmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- BURSARY / YOUTH BURSARIES
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('bursary_youth_bursaries', 'page_title',    'text', 'Youth Bursaries', null),
('bursary_youth_bursaries', 'page_subtitle', 'text', 'Financial support for young BVA athletes', null),
('bursary_youth_bursaries', 'intro_text',    'text', 'The BVA offers youth bursaries to support young athletes who demonstrate financial need. Bursaries help cover program fees, travel, and equipment costs.', null),
('bursary_youth_bursaries', 'contact_email', 'text', 'bvabursary@hotmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- MEMBERSHIP
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('membership', 'page_title',           'text', 'Membership Registration', null),
('membership', 'page_subtitle',        'text', 'Join the BVA family — membership year runs Oct 1 to Sep 30', null),
('membership', 'intro_text',           'text', 'All BVA Leagues and Clinics (and most other BVA events throughout the year), require a current paid BVA membership. Not a member? Not a problem — you can register online in minutes and the membership fee can be easily paid by credit card.', null),
('membership', 'youth_name',           'text', 'Youth', null),
('membership', 'youth_price',          'text', 'Free', null),
('membership', 'youth_period',         'text', 'Until age 18', null),
('membership', 'youth_description',    'text', 'Youth membership is for anyone age 18 and under. Membership will continue through September 30 of the year you turn 18.', null),
('membership', 'two_year_name',        'text', '2-Year', null),
('membership', 'two_year_price',       'text', '$50', null),
('membership', 'two_year_period',      'text', 'October 2025 – September 2027', null),
('membership', 'two_year_description', 'text', 'Two-year membership giving you access to all BVA programs.', null),
('membership', 'five_year_name',       'text', '5-Year', null),
('membership', 'five_year_price',      'text', '$100', null),
('membership', 'five_year_period',     'text', 'October 2025 – September 2030', null),
('membership', 'five_year_description','text', 'Five-year membership — best value for committed players.', null),
('membership', 'lifetime_name',        'text', 'Lifetime', null),
('membership', 'lifetime_price',       'text', '$150', null),
('membership', 'lifetime_period',      'text', 'Pay once and be done!', null),
('membership', 'lifetime_description', 'text', 'Lifetime membership — never worry about renewals again.', null),
('membership', 'membership_year_note', 'text', 'BVA membership year runs October 1st – September 30th.', null),
('membership', 'contact_email',        'text', 'bvamemberships@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- SUMMER LEAGUE
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('summer_league', 'page_title',              'text', 'Summer League Registration', null),
('summer_league', 'page_subtitle',           'text', 'Beach volleyball leagues — May through September', null),
('summer_league', 'hero_image',              'image', null, ''),
('summer_league', 'registration_heading',    'text', 'Registration Information for Team Captains & All Participants', null),
('summer_league', 'registration_opens',      'text', 'Registration will open at midnight on May 26th and close on May 31st, or once the league is full.', null),
('summer_league', 'captain_instructions',    'text', 'Team Captains must register from May 26–31, pay by credit card at time of registration, and complete team rosters by June 1.', null),
('summer_league', 'participant_instructions','text', 'All Participants must ensure BVA membership is up to date before registering.', null),
('summer_league', 'contact_email',           'text', 'bermudavolleyball@gmail.com', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- GALLERY
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('gallery', 'page_title',    'text', 'Gallery', null),
('gallery', 'page_subtitle', 'text', 'Photos, videos, and memories from BVA events', null),
('gallery', 'intro_text',    'text', 'Browse photos and videos from BVA leagues, tournaments, and national team events.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- GALLERY / HISTORY
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('gallery_history', 'page_title',    'text', 'History', null),
('gallery_history', 'page_subtitle', 'text', 'Over 50 years of volleyball in Bermuda', null),
('gallery_history', 'intro_text',    'text', 'Explore the history of volleyball in Bermuda from the BVA''s founding to today.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- GALLERY / VIDEOS
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('gallery_videos', 'page_title',    'text', 'Videos', null),
('gallery_videos', 'page_subtitle', 'text', 'Watch highlights from BVA events and national team matches', null),
('gallery_videos', 'intro_text',    'text', 'Video highlights from BVA leagues, tournaments, and national team competitions.', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- ============================================================
-- GALLERY / SOCIAL MEDIA
-- ============================================================
INSERT INTO public.page_content (page_slug, section_key, content_type, text_value, image_url) VALUES
('gallery_social', 'page_title',    'text', 'Social Media', null),
('gallery_social', 'page_subtitle', 'text', 'Follow BVA on social media', null),
('gallery_social', 'intro_text',    'text', 'Stay connected with the Bermuda Volleyball Association on social media for the latest news, photos, and updates.', null),
('gallery_social', 'facebook_url',  'text', 'https://www.facebook.com/bermudavolleyball', null),
('gallery_social', 'instagram_url', 'text', 'https://www.instagram.com/bermudavolleyball', null)
ON CONFLICT (page_slug, section_key) DO NOTHING;
