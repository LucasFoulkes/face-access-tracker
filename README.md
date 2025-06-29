we have used this sql snipet
```sql
-- Create the worker_profiles table with South American naming conventions
CREATE TABLE worker_profiles (
  id uuid REFERENCES auth.users(id) PRIMARY KEY,
  nombres text NOT NULL,                    -- First name(s): "Juan Carlos"
  apellido_paterno text NOT NULL,           -- Paternal surname: "García"
  apellido_materno text NOT NULL,           -- Maternal surname: "López" 
  cedula text UNIQUE NOT NULL,              -- National ID: "1234567890"
  pin text UNIQUE NOT NULL,                 -- Auto-generated 4-digit PIN
  email text NOT NULL,                      -- Generated email for auth
  nombre_completo text NOT NULL,            -- Full name: "Juan Carlos García López"
  departamento text,                        -- Department/Area (optional)
  cargo text,                              -- Job title (optional)
  activo boolean DEFAULT true,             -- Active status
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_worker_profiles_pin ON worker_profiles(pin);
CREATE INDEX idx_worker_profiles_cedula ON worker_profiles(cedula);
CREATE INDEX idx_worker_profiles_nombre_completo ON worker_profiles(nombre_completo);

C-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_worker_profiles_updated_at 
    BEFORE UPDATE ON worker_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
-
-- Database function to generate unique PIN and create worker profile
CREATE OR REPLACE FUNCTION create_worker_profile(
  p_user_id uuid,
  p_nombres text,
  p_apellido_paterno text,
  p_apellido_materno text,
  p_cedula text,
  p_email text,
  p_nombre_completo text
) RETURNS TABLE(
  id uuid,
  nombres text,
  apellido_paterno text,
  apellido_materno text,
  cedula text,
  pin text,
  email text,
  nombre_completo text,
  created_at timestamp
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_pin text;
  attempt_count int := 0;
  max_attempts int := 50;
BEGIN
  -- Check if cedula already exists
  IF EXISTS (SELECT 1 FROM worker_profiles WHERE worker_profiles.cedula = p_cedula) THEN
    RAISE EXCEPTION 'Ya existe un trabajador con la cédula %', p_cedula;
  END IF;

  -- Validate inputs
  IF LENGTH(TRIM(p_nombres)) = 0 THEN
    RAISE EXCEPTION 'Los nombres son obligatorios';
  END IF;
  
  IF LENGTH(TRIM(p_apellido_paterno)) = 0 THEN
    RAISE EXCEPTION 'El apellido paterno es obligatorio';
  END IF;
  
  IF LENGTH(TRIM(p_apellido_materno)) = 0 THEN
    RAISE EXCEPTION 'El apellido materno es obligatorio';
  END IF;
  
  IF LENGTH(p_cedula) != 10 OR p_cedula !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'La cédula debe tener exactamente 10 dígitos';
  END IF;

  -- Generate unique PIN
  LOOP
    attempt_count := attempt_count + 1;
    
    IF attempt_count > max_attempts THEN
      RAISE EXCEPTION 'No se pudo generar un PIN único después de % intentos', max_attempts;
    END IF;
    
    -- Generate 4-digit PIN (1000-9999)
    generated_pin := LPAD((FLOOR(RANDOM() * 9000) + 1000)::text, 4, '0');
    
    -- Check if PIN is unique
    IF NOT EXISTS (SELECT 1 FROM worker_profiles WHERE worker_profiles.pin = generated_pin) THEN
      EXIT; -- PIN is unique, exit loop
    END IF;
  END LOOP;

  -- Insert worker profile with generated PIN
  INSERT INTO worker_profiles (
    id, 
    nombres, 
    apellido_paterno, 
    apellido_materno, 
    cedula, 
    pin, 
    email,
    nombre_completo
  )
  VALUES (
    p_user_id, 
    TRIM(p_nombres), 
    TRIM(p_apellido_paterno), 
    TRIM(p_apellido_materno), 
    TRIM(p_cedula), 
    generated_pin, 
    p_email,
    TRIM(p_nombre_completo)
  );

  -- Return the created worker data
  RETURN QUERY
  SELECT 
    wp.id,
    wp.nombres,
    wp.apellido_paterno,
    wp.apellido_materno,
    wp.cedula,
    wp.pin,
    wp.email,
    wp.nombre_completo,
    wp.created_at
  FROM worker_profiles wp
  WHERE wp.id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_worker_profile TO authenticated;

-- Create RLS (Row Level Security) policies
ALTER TABLE worker_profiles ENABLE ROW LEVEL SECURITY;

-- Workers can only see their own profile
CREATE POLICY "Trabajadores ven su propio perfil" ON worker_profiles
  FOR SELECT USING (auth.uid() = id);

-- Only service role can insert/update worker profiles (for admin functions)
CREATE POLICY "Solo administradores pueden crear trabajadores" ON worker_profiles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Solo administradores pueden actualizar trabajadores" ON worker_profiles
  FOR UPDATE USING (auth.role() = 'service_role');

-- Function to search workers (for admin use)
CREATE OR REPLACE FUNCTION search_workers(search_term text DEFAULT '')
RETURNS TABLE(
  id uuid,
  nombres text,
  apellido_paterno text,
  apellido_materno text,
  nombre_completo text,
  cedula text,
  pin text,
  departamento text,
  cargo text,
  activo boolean,
  created_at timestamp
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.id,
    wp.nombres,
    wp.apellido_paterno,
    wp.apellido_materno,
    wp.nombre_completo,
    wp.cedula,
    wp.pin,
    wp.departamento,
    wp.cargo,
    wp.activo,
    wp.created_at
  FROM worker_profiles wp
  WHERE 
    (search_term = '' OR 
     wp.nombre_completo ILIKE '%' || search_term || '%' OR
     wp.cedula ILIKE '%' || search_term || '%' OR
     wp.departamento ILIKE '%' || search_term || '%')
  ORDER BY wp.nombre_completo;
END;
$$;

GRANT EXECUTE ON FUNCTION search_workers TO authenticated;
```