import React from "react";

interface FormInputProps {
  type: string;
  id: string;
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({
  type,
  id,
  name,
  label,
  placeholder,
  icon,
  rightElement,
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-bold tracking-[0.15em] uppercase text-gray-500"
      >
        {label}
      </label>
      <div className="relative group">
        {icon && (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400
                           group-focus-within:text-slate-700
                           pointer-events-none flex items-center transition-colors duration-150"
          >
            {icon}
          </span>
        )}
        <input
          type={type}
          id={id}
          name={name}
          placeholder={placeholder}
          className={`
            w-full py-3 text-sm rounded-xl
            bg-gray-50 border border-gray-200
            text-gray-900 placeholder:text-gray-400
            hover:border-gray-300
            focus:outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/8
            focus:bg-white
            transition-all duration-150
            caret-slate-900
            ${icon ? "pl-10" : "pl-4"}
            ${rightElement ? "pr-10" : "pr-4"}
          `}
        />
        {rightElement && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </span>
        )}
      </div>
    </div>
  );
};

export default FormInput;
