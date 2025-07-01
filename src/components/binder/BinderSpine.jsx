import PropTypes from "prop-types";

const BinderSpine = ({
  className = "w-2 bg-gray-400 dark:bg-gray-600 rounded-full shadow-lg",
  style = {},
}) => {
  return (
    <div
      className={className}
      style={style}
      role="separator"
      aria-label="Binder spine"
    />
  );
};

BinderSpine.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
};

export default BinderSpine;
