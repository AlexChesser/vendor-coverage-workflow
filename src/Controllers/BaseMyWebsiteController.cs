using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;
using vendor_coverage_workflow.Models;

namespace vendor_coverage_workflow.Controllers
{
    public abstract class BaseMyWebsiteController : Controller
    {
        public override void OnActionExecuting(ActionExecutingContext context)
        {
            base.OnActionExecuting(context);
            Request.Query.TryGetValue("generatecoverage", out StringValues fullcss);
            ViewBag.GenerateCoverage = fullcss.Count > 0 && fullcss[0].ToLower() == "true";
        }
    }
}
