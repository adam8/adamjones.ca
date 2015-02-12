var CommentBox = React.createClass({
  componentDidMount: function () {
    window.addEventListener('scroll', this.onPageScroll);
  },

  componentWillUnmount: function () {
    window.removeEventListener('scroll', this.onPageScroll);
  },
  
  onPageScroll: function () {
    var bg = document.getElementById("bg");
    var bgPos = (document.body.scrollTop);
    var height = $(document).height();
    
    console.log(bgPos);
    bg.style.opacity = (bgPos/height * 2) + .15;
    //bg.style["-webkit-transform"] = "translate3d(0," + bgPos + "px, 0)";
    //bg.style["transform"] = "translate3d(0px, " + bgPos + "px, 0)";
  },
  
  render: function() {
    return (
      <div className="content-box social">
        <a href="https://dribbble.com/adamskye">Dribbble</a>
        <a href="https://github.com/adam8">GitHub</a>
        <a href="https://www.linkedin.com/in/adamskyejones">LinkedIn</a>
      </div>
    );
  }
  
});
React.render(
  <CommentBox />,
  document.getElementById('content')
);