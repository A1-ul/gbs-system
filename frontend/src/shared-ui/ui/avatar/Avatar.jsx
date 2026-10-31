import PropTypes from "prop-types";

function Avatar({
    src,
    alt
}) {

    return (
        <img
            src={src}
            alt={alt}
            className="gbs-avatar"
        />
    );
}

Avatar.propTypes = {
    src: PropTypes.string,
    alt: PropTypes.string
};

export default Avatar;