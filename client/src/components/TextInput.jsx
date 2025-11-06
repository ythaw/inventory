export default function TextInput({ label, type = 'text', value, onChange, placeholder, name, autoComplete, classname }) {
  return (
    <div className="block">
      <label className="input-label">{label}</label>
      <div className={`input-card ${classname || ''}`}>
        <input
          className="input"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          name={name}
          autoComplete={autoComplete}
        />
      </div>
    </div>
  );
}


